import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { assertPublicResolvedAddresses, isForbiddenAddress, isRetryableWebhookStatus, validateOutgoingWebhookAction } from './webhook-security.ts';

Deno.test('blocks private, local, multicast, and non-public IPv4 targets', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '224.0.0.1']) {
    assertEquals(isForbiddenAddress(address), true);
  }
});

Deno.test('blocks private and special IPv6 targets', () => {
  for (const address of ['::1', 'fc00::1', 'fd00::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1']) {
    assertEquals(isForbiddenAddress(address), true);
  }
});

Deno.test('only permits HTTPS POST webhooks without credentials or nonstandard ports', () => {
  assertEquals(validateOutgoingWebhookAction({ type: 'outgoing_webhook', config: { url: 'https://example.com/webhook', method: 'POST' } }).hostname, 'example.com');
  assertThrows(() => validateOutgoingWebhookAction({ type: 'outgoing_webhook', config: { url: 'http://example.com', method: 'POST' } }));
  assertThrows(() => validateOutgoingWebhookAction({ type: 'outgoing_webhook', config: { url: 'https://user@example.com', method: 'POST' } }));
  assertThrows(() => validateOutgoingWebhookAction({ type: 'outgoing_webhook', config: { url: 'https://example.com:8443', method: 'POST' } }));
});

Deno.test('rejects hostnames whose resolved addresses are private', () => {
  assertThrows(() => assertPublicResolvedAddresses(['10.0.0.8']));
  assertThrows(() => assertPublicResolvedAddresses(['2606:4700::1111', 'fd00::1']));
  assertPublicResolvedAddresses(['93.184.216.34', '2606:4700::1111']);
});

Deno.test('retries only network-class HTTP outcomes', () => {
  assertEquals(isRetryableWebhookStatus(429), true);
  assertEquals(isRetryableWebhookStatus(500), true);
  assertEquals(isRetryableWebhookStatus(400), false);
  assertEquals(isRetryableWebhookStatus(302), false);
});
