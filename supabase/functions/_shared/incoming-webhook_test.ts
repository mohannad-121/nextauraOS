import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { readIncomingWebhookJson } from './incoming-webhook.ts';

Deno.test('redacts credential-like fields from incoming webhook payloads', async () => {
  const payload = await readIncomingWebhookJson(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ name: 'Ada', authorization: 'secret', nested: { api_key: 'secret' } }) }));
  assertEquals(payload, { name: 'Ada', authorization: '[REDACTED]', nested: { api_key: '[REDACTED]' } });
});

Deno.test('rejects malformed and oversized JSON payloads', async () => {
  await assertRejects(() => readIncomingWebhookJson(new Request('https://example.test', { method: 'POST', body: '{' })));
  await assertRejects(() => readIncomingWebhookJson(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ body: 'x'.repeat(65 * 1024) }) })));
});
