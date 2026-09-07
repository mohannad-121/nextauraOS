const environment = Deno.env.get('PADDLE_ENV') || 'sandbox';
const baseUrl = environment === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';

export async function paddleRequest(path: string, method = 'GET', body?: Record<string, unknown>) {
  const apiKey = Deno.env.get('PADDLE_API_KEY');
  if (!apiKey) throw new Error('Paddle is not configured. Add PADDLE_API_KEY to Supabase Edge Function secrets.');
  const response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.detail || payload?.error?.message || `Paddle request failed (${response.status})`);
  return payload?.data ?? payload;
}
