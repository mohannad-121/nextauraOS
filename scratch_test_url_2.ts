import { buildInstagramAuthorizationUrl } from './supabase/functions/_shared/instagram-integration.ts';

Deno.env.set('INSTAGRAM_APP_ID', '1061228336618492');
Deno.env.set('INSTAGRAM_APP_SECRET', 'test-secret');
Deno.env.set('INSTAGRAM_OAUTH_REDIRECT_URI', 'https://vsivakmwvdyqhrrusgmp.supabase.co/functions/v1/instagram-oauth-callback');

const url = buildInstagramAuthorizationUrl('test-state-123', false);
console.log(url);
