export const API_SCOPES = [
  'employees:read',
  'contacts:read',
  'invoices:read',
  'expenses:read',
  'payroll:read',
  'documents:read',
  'approvals:read',
] as const;

export type ApiScope = typeof API_SCOPES[number];

const encoder = new TextEncoder();
const KEY_PATTERN = /^nxa_(?:live|test)_[A-Za-z0-9_-]{32,}$/;

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function hashSecret() {
  const secret = Deno.env.get('NEXTAURA_API_KEY_HASH_SECRET');
  if (!secret || secret.length < 32) throw new Error('External API key hashing is not configured.');
  return secret;
}

export function apiKeyMode() {
  return Deno.env.get('NEXTAURA_API_KEY_MODE') === 'live' ? 'live' : 'test';
}

export function createApiKey() {
  const mode = apiKeyMode();
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const rawKey = `nxa_${mode}_${base64Url(random)}`;
  return { rawKey, keyPrefix: rawKey.slice(0, 17) };
}

export function isApiKeyFormat(value: string) {
  return KEY_PATTERN.test(value);
}

export async function hashApiKey(rawKey: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(hashSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawKey));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function normalizeScopes(value: unknown): ApiScope[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const scopes = [...new Set(value.map((scope) => String(scope)))];
  return scopes.every((scope): scope is ApiScope => (API_SCOPES as readonly string[]).includes(scope)) ? scopes : null;
}

export function apiKeyMetadata(key: Record<string, unknown>) {
  return {
    id: key.id,
    name: key.name,
    key_prefix: key.key_prefix,
    scopes: key.scopes,
    created_by: key.created_by,
    created_at: key.created_at,
    last_used_at: key.last_used_at,
    revoked_at: key.revoked_at,
    status: key.status,
  };
}
