const MAX_WEBHOOK_URL_LENGTH = 2048;

export class WebhookActionError extends Error {
  constructor(message: string, public readonly retryable = false) {
    super(message);
    this.name = 'WebhookActionError';
  }
}

function normalizedHost(value: string) {
  return value.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function parseIpv4(value: string): number[] | null {
  const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  return octets.some((octet) => octet > 255) ? null : octets;
}

export function isForbiddenIpv4(value: string) {
  const octets = parseIpv4(value);
  if (!octets) return false;
  const [first, second] = octets;
  return first === 0
    || first === 10
    || first === 100 && second >= 64 && second <= 127
    || first === 127
    || first === 169 && second === 254
    || first === 172 && second >= 16 && second <= 31
    || first === 192 && (second === 0 || second === 168)
    || first >= 224;
}

export function isForbiddenIpv6(value: string) {
  const ip = normalizedHost(value);
  if (!ip.includes(':')) return false;
  if (ip === '::' || ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || /^fe[89ab]/.test(ip) || ip.startsWith('ff')) return true;

  const mappedIpv4 = ip.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1]
    || ip.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isForbiddenIpv4(mappedIpv4);

  // Permit only public global unicast ranges. 6to4 and Teredo can encode a
  // private IPv4 destination, so they are not accepted for webhook delivery.
  return !/^[23]/.test(ip) || ip.startsWith('2002:') || ip.startsWith('2001:0');
}

export function isForbiddenAddress(value: string) {
  return isForbiddenIpv4(value) || isForbiddenIpv6(value);
}

export function assertPublicResolvedAddresses(addresses: string[]): void {
  if (!addresses.length || addresses.some(isForbiddenAddress)) {
    throw new WebhookActionError('Outgoing webhook target is not allowed.');
  }
}

export function isRetryableWebhookStatus(status: number) {
  return status === 429 || status >= 500;
}

export function validateOutgoingWebhookAction(action: unknown): URL {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw new WebhookActionError('Outgoing webhook configuration is invalid.');
  }
  const record = action as Record<string, unknown>;
  if (record.type !== 'outgoing_webhook' || !record.config || typeof record.config !== 'object' || Array.isArray(record.config)) {
    throw new WebhookActionError('Outgoing webhook configuration is invalid.');
  }
  const config = record.config as Record<string, unknown>;
  if (Object.keys(config).some((key) => key !== 'url' && key !== 'method')
    || config.method !== 'POST'
    || typeof config.url !== 'string'
    || !config.url.trim()
    || config.url.length > MAX_WEBHOOK_URL_LENGTH) {
    throw new WebhookActionError('Outgoing webhooks require an HTTPS POST URL.');
  }

  let url: URL;
  try {
    url = new URL(config.url.trim());
  } catch {
    throw new WebhookActionError('Outgoing webhook URL is invalid.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new WebhookActionError('Outgoing webhook URL is not allowed.');
  }
  const host = normalizedHost(url.hostname);
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || isForbiddenAddress(host)) {
    throw new WebhookActionError('Outgoing webhook target is not allowed.');
  }
  url.hash = '';
  return url;
}

export async function assertPublicWebhookTarget(url: URL): Promise<void> {
  const host = normalizedHost(url.hostname);
  if (parseIpv4(host) || host.includes(':')) {
    if (isForbiddenAddress(host)) throw new WebhookActionError('Outgoing webhook target is not allowed.');
    return;
  }

  const lookups = await Promise.allSettled([
    Deno.resolveDns(host, 'A'),
    Deno.resolveDns(host, 'AAAA'),
  ]);
  const addresses = lookups.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  assertPublicResolvedAddresses(addresses);
}

export async function discardBoundedResponse(response: Response, maximumBytes = 4096): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  let bytesRead = 0;
  try {
    while (bytesRead < maximumBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
