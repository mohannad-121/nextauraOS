import { buildInstagramAuthorizationUrl } from './supabase/functions/_shared/instagram-integration.ts';
const url = buildInstagramAuthorizationUrl('test-state', false);
console.log(url);
