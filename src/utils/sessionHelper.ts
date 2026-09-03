/**
 * Extracts the authoritative Supabase session_id claim from JWT access token payload
 */
export function getSupabaseSessionId(session: any): string | null {
  if (!session?.access_token) return null;
  return getSessionIdFromJwt(session.access_token);
}

export function getSessionIdFromJwt(accessToken: string): string | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split('.');
    if (parts.length === 3) {
      // Decode Base64URL payload
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      return parsed.session_id || parsed.sid || parsed.sub || null;
    }
  } catch (err) {
    console.error('[Session Helper] Failed to parse JWT payload:', err);
  }
  return null;
}
