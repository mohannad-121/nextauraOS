import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Verify user JWT
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const candidateCode = (body.code || '').trim();

    if (!candidateCode || candidateCode.length !== 6 || !/^\d{6}$/.test(candidateCode)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid 6-digit verification code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch active challenge for user
    const { data: challenges, error: fetchErr } = await supabaseAdmin
      .from('login_verification_challenges')
      .select('*')
      .eq('user_id', user.id)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr || !challenges || challenges.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Verification code missing or expired. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const challenge = challenges[0];

    if (challenge.attempt_count >= challenge.max_attempts) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum attempts exceeded. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute HMAC candidate hash
    const serverSecret = serviceRoleKey || 'nextaura-server-otp-secret';
    const candidateHash = await hmacSha256(serverSecret, candidateCode);

    if (challenge.code_hash !== candidateHash) {
      // Increment attempt count in DB
      await supabaseAdmin
        .from('login_verification_challenges')
        .update({ attempt_count: challenge.attempt_count + 1 })
        .eq('id', challenge.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Incorrect verification code. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark challenge as verified in DB
    await supabaseAdmin
      .from('login_verification_challenges')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', challenge.id);

    // Update profile email verification status
    await supabaseAdmin
      .from('profiles')
      .update({ email_verified: true, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Server error verifying code' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
