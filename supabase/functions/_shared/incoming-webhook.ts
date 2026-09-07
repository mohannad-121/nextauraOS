const encoder = new TextEncoder();
const MAX_BODY_BYTES = 64 * 1024;

export function createIncomingWebhookToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `nxa_iw_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function hashIncomingWebhookToken(token: string) {
  const secret = Deno.env.get('AUTOMATION_INCOMING_WEBHOOK_TOKEN_HASH_SECRET') || '';
  if (!secret || !/^nxa_iw_[a-f0-9]{64}$/.test(token)) throw new Error('Incoming webhook token is invalid.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(token)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function readIncomingWebhookJson(req: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) throw new Error('Webhook payload is too large.');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('Webhook payload is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_BODY_BYTES) throw new Error('Webhook payload is too large.'); chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('Webhook payload must be valid JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Webhook payload must be a JSON object.');
  return redactPayload(parsed as Record<string, unknown>);
}

function redactPayload(value: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 6) return {};
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (/(authorization|cookie|token|secret|password|api[_-]?key)/i.test(key)) { output[key] = '[REDACTED]'; continue; }
    if (Array.isArray(item)) output[key] = item.slice(0, 50).map((entry) => entry && typeof entry === 'object' && !Array.isArray(entry) ? redactPayload(entry as Record<string, unknown>, depth + 1) : entry);
    else if (item && typeof item === 'object') output[key] = redactPayload(item as Record<string, unknown>, depth + 1);
    else if (typeof item === 'string') output[key] = item.slice(0, 4000);
    else if (['number', 'boolean'].includes(typeof item) || item === null) output[key] = item;
  }
  return output;
}
