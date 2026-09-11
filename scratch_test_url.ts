import { buildInstagramAuthorizationUrl } from './supabase/functions/_shared/instagram-integration.ts';

const url = buildInstagramAuthorizationUrl({
  state: 'test-state-123',
  clientId: 'test-client-id',
  redirectUri: 'https://vsivakmwvdyqhrrusgmp.supabase.co/functions/v1/instagram-oauth-callback',
  reconnect: false
});

console.log(url);
