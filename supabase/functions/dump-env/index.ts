import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
serve(async (req) => {
  const uri = Deno.env.get('INSTAGRAM_OAUTH_REDIRECT_URI') || '';
  return new Response(JSON.stringify({
    rawUri: uri,
    length: uri.length,
    expectedLength: "https://vsivakmwvdyqhrrusgmp.supabase.co/functions/v1/instagram-oauth-callback".length,
    hasTrailingSlash: uri.endsWith('/'),
    hasWhitespace: /\s/.test(uri),
    charCodes: Array.from(uri).map(c => c.charCodeAt(0))
  }), { headers: { "Content-Type": "application/json" } });
});
