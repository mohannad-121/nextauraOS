const res1 = await fetch('https://www.instagram.com/oauth/authorize?client_id=1061228336618492&redirect_uri=https://vsivakmwvdyqhrrusgmp.supabase.co/functions/v1/instagram-oauth-callback&response_type=code&scope=instagram_business_basic');
console.log('www:', res1.status, res1.url);

const res2 = await fetch('https://api.instagram.com/oauth/authorize?client_id=1061228336618492&redirect_uri=https://vsivakmwvdyqhrrusgmp.supabase.co/functions/v1/instagram-oauth-callback&response_type=code&scope=instagram_business_basic');
console.log('api:', res2.status, res2.url);
