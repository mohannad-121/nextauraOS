import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = atob(base64);
      return JSON.parse(jsonStr);
    }
  } catch (err) {
    console.error('Failed to parse JWT in Edge Function:', err);
  }
  return {};
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, verified: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Verify user JWT token server-side
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, verified: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract real session_id claim. FAIL CLOSED if missing! No user.id or sub fallbacks.
    const payload = parseJwtPayload(token);
    const sessionId = payload.session_id || payload.sid || null;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, verified: false, error: 'Valid Supabase session_id claim is missing from authentication token.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query login_verification_challenges for completed verification for THIS exact session
    const { data: challenges, error: fetchErr } = await supabaseAdmin
      .from('login_verification_challenges')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .not('verified_at', 'is', null)
      .limit(1);

    if (fetchErr) {
      console.error('[CheckVerification] Database query error:', fetchErr);
      return new Response(
        JSON.stringify({ success: false, verified: false, error: 'Failed to verify session status.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isVerified = Boolean(challenges && challenges.length > 0);

    return new Response(
      JSON.stringify({ success: true, verified: isVerified }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, verified: false, error: err.message || 'Server error checking verification status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
