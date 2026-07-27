/**
 * Edge-compatible permission session encoding.
 * Uses base64url (available in Edge/Web API) for encoding.
 * No Node.js deps — safe for middleware.
 */

const CURRENT_VERSION = 1;
const COOKIE_PREFIX = 'ps_v' + CURRENT_VERSION + ':';

export interface PermissionSessionData {
  permissions: string[];
  version: number;
  timestamp: number;
}

function base64urlEncode(str: string): string {
  // Web API base64 — available in Edge runtime
  const encoded = globalThis.btoa(str);
  // Convert to base64url (URL-safe)
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  return globalThis.atob(normalized);
}

/**
 * Encode permissions into a cookie value string.
 * Format: ps_v1:<base64url-json>
 */
export function encodePermissions(permissions: string[]): string {
  const data: PermissionSessionData = {
    permissions,
    version: CURRENT_VERSION,
    timestamp: Date.now(),
  };
  const json = JSON.stringify(data);
  return COOKIE_PREFIX + base64urlEncode(json);
}

/**
 * Decode permission session cookie value.
 */
export function decodePermissions(encoded: string): PermissionSessionData | null {
  try {
    if (!encoded.startsWith(COOKIE_PREFIX)) return null;
    const b64 = encoded.slice(COOKIE_PREFIX.length);
    const json = base64urlDecode(b64);
    const data = JSON.parse(json) as PermissionSessionData;
    if (!Array.isArray(data.permissions) || data.version !== CURRENT_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}
