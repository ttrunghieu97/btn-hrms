import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { buildBackendUrl } from '@/lib/server/backend-proxy';
import { evictServerSessionCache } from '@/lib/server/auth-session';
import { getAccessCookieName, getRefreshCookieName } from '@/lib/env.server';

export async function POST() {
  const cookieStore = await cookies();
  const accessCookieName = getAccessCookieName();
  const refreshCookieName = getRefreshCookieName();

  const accessToken = cookieStore.get(accessCookieName)?.value;
  const refreshToken = cookieStore.get(refreshCookieName)?.value;

  await evictServerSessionCache(accessToken);

  // Try to invalidate the session on the backend if possible.
  // Catch errors in case the backend is down (which is the case for service-unavailable).
  if (refreshToken) {
    try {
      await fetch(buildBackendUrl('/auth/logout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore backend errors when logging out
    }
  }

  // Delete the HTTP-only cookies on the frontend/BFF side
  cookieStore.delete(accessCookieName);
  cookieStore.delete(refreshCookieName);
  cookieStore.delete('session_perms');

  return NextResponse.json({ ok: true });
}
