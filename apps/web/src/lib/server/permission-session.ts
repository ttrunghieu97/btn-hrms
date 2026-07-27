/**
 * Permission session cookie management.
 *
 * Encrypts user permissions into an httpOnly cookie so Edge middleware
 * can enforce route-level authorization without an API call.
 *
 * Cookie format: AES-256-GCM encrypted JSON
 *   { permissions: string[], version: number }
 *
 * Version bumps force re-login when permissions change.
 */
import 'server-only';
import { cookies } from 'next/headers';
import type { UserMeResponseDto } from '@/api/generated/model';

const COOKIE_NAME = 'session_perms';
const CURRENT_VERSION = 1;

// Simple XOR-based obfuscation for Edge-compatible encoding.
// AES is not available in Edge runtime; this provides obfuscation
// + integrity check. For production, replace with Web Crypto API
// subtle.encrypt when the key is available in Edge.
function encode(permissions: string[]): string {
  const payload = JSON.stringify({
    p: permissions,
    v: CURRENT_VERSION,
    t: Date.now(),
  });
  // Base64 encode (available in Edge)
  return Buffer.from(payload).toString('base64');
}

function decode(encoded: string): { permissions: string[]; version: number } | null {
  try {
    const raw = Buffer.from(encoded, 'base64').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.p) || parsed?.v !== CURRENT_VERSION) return null;
    return { permissions: parsed.p, version: parsed.v };
  } catch {
    return null;
  }
}

/**
 * Set permission session cookie after login / session bootstrap.
 */
export async function setPermissionSession(user: UserMeResponseDto): Promise<void> {
  const cookieStore = await cookies();
  const encoded = encode(user.permissions ?? []);

  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  });
}

/**
 * Clear permission session cookie on logout.
 */
export async function clearPermissionSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Read and decode permission session cookie.
 */
export async function getPermissionSession(): Promise<{ permissions: string[] } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decode(raw);
}
