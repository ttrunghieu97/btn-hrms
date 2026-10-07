/**
 * Edge-compatible permission session encoding.
 * Uses Web Crypto API (HMAC-SHA256) and base64url for tamper-proof session encoding.
 * No Node.js deps — safe for Edge runtime and Node.js.
 */

const CURRENT_VERSION = 2;
const COOKIE_PREFIX = 'ps_v' + CURRENT_VERSION + ':';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PermissionSessionData {
  permissions: string[];
  version: number;
  timestamp: number;
}

function bufferToBase64Url(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(b64url: string): Uint8Array {
  const normalized = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = globalThis.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToBase64Url(str: string): string {
  const enc = new TextEncoder();
  return bufferToBase64Url(enc.encode(str));
}

function base64UrlToString(b64url: string): string {
  const bytes = base64UrlToBuffer(b64url);
  const dec = new TextDecoder();
  return dec.decode(bytes);
}

function getSecret(explicitSecret?: string): string {
  const secret =
    explicitSecret ||
    process.env.AUTH_COOKIE_SECRET ||
    process.env.AUTH_JWT_SECRET ||
    process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_COOKIE_SECRET or AUTH_JWT_SECRET must be configured');
    }
    return 'btn-hrms-dev-cookie-secret-do-not-use-in-production';
  }
  return secret;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Encode permissions into a tamper-proof cookie value string.
 * Format: ps_v2:<base64url-json>.<base64url-hmac>
 */
export async function encodePermissions(
  permissions: string[],
  explicitSecret?: string,
): Promise<string> {
  const data: PermissionSessionData = {
    permissions,
    version: CURRENT_VERSION,
    timestamp: Date.now(),
  };
  const json = JSON.stringify(data);
  const payloadB64 = stringToBase64Url(json);

  const secret = getSecret(explicitSecret);
  const key = await getCryptoKey(secret);
  const enc = new TextEncoder();
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigB64 = bufferToBase64Url(new Uint8Array(signature));

  return `${COOKIE_PREFIX}${payloadB64}.${sigB64}`;
}

/**
 * Decode and verify permission session cookie value.
 * Returns null if invalid signature, expired, malformed, or tampered.
 */
export async function decodePermissions(
  encoded: string,
  explicitSecret?: string,
): Promise<PermissionSessionData | null> {
  try {
    if (!encoded || !encoded.startsWith(COOKIE_PREFIX)) return null;

    const token = encoded.slice(COOKIE_PREFIX.length);
    const dotIndex = token.indexOf('.');
    if (dotIndex === -1) return null;

    const payloadB64 = token.slice(0, dotIndex);
    const sigB64 = token.slice(dotIndex + 1);
    if (!payloadB64 || !sigB64) return null;

    const secret = getSecret(explicitSecret);
    const key = await getCryptoKey(secret);
    const enc = new TextEncoder();
    const sigBytes = base64UrlToBuffer(sigB64);

    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      enc.encode(payloadB64),
    );
    if (!isValid) return null;

    const json = base64UrlToString(payloadB64);
    const data = JSON.parse(json) as PermissionSessionData;

    if (!Array.isArray(data.permissions) || data.version !== CURRENT_VERSION) {
      return null;
    }

    // Check expiration (24h)
    if (Date.now() - data.timestamp > MAX_AGE_MS) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
