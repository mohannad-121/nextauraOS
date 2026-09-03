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
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';

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
    const sessionId = body.sessionId || token.substring(0, 32);
    const email = user.email;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'User email not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cryptographically secure 6-digit random code
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const otpCode = (100000 + (randomArray[0] % 900000)).toString();

    // Compute server HMAC-SHA256 code hash
    const serverSecret = serviceRoleKey || 'nextaura-server-otp-secret';
    const codeHash = await hmacSha256(serverSecret, otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate existing active challenges for user + session
    await supabaseAdmin
      .from('login_verification_challenges')
      .delete()
      .eq('user_id', user.id)
      .is('verified_at', null);

    // Insert new challenge via service role
    const { error: insertError } = await supabaseAdmin
      .from('login_verification_challenges')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        code_hash: codeHash,
        expires_at: expiresAt,
        attempt_count: 0,
        max_attempts: 5,
      });

    if (insertError) {
      console.error('Failed to store challenge:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record verification challenge' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send Email via Resend HTTP API
    let emailSent = false;
    if (resendApiKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NextAura Security <security@nextaura.ai>',
          to: [email],
          subject: 'Your NextAura verification code',
          html: `
            <div style="font-family:sans-serif; background-color:#020617; color:#f8fafc; padding:32px; border-radius:16px; max-width:500px; margin:0 auto; text-align:center;">
              <h2 style="font-size:22px; font-weight:800; color:#f8fafc;">Verify your login</h2>
              <p style="font-size:14px; color:#94a3b8;">Use this 6-digit code to access your workspace:</p>
              <div style="background-color:#0f172a; border:1px solid #38bdf8; padding:20px; border-radius:14px; display:inline-block; margin:20px 0;">
                <span style="font-family:monospace; font-size:36px; font-weight:900; letter-spacing:8px; color:#38bdf8;">${otpCode}</span>
              </div>
              <p style="font-size:12px; color:#64748b;">Code expires in 10 minutes.</p>
            </div>
          `,
        }),
      });

      if (resendRes.ok) {
        emailSent = true;
      } else {
        const errText = await resendRes.text();
        console.error('Resend delivery failure:', errText);
      }
    } else {
      console.warn('RESEND_API_KEY not configured on server');
    }

    if (!emailSent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to send verification code. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Server error generating verification code' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
