import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { buildBackendUrl } from '@/lib/server/backend-proxy';

export async function POST() {
  const cookieStore = await cookies();
  const accessCookieName = process.env.AUTH_ACCESS_COOKIE_NAME ?? 'access_token';
  const refreshCookieName = process.env.AUTH_REFRESH_COOKIE_NAME ?? 'refresh_token';

  const refreshToken = cookieStore.get(refreshCookieName)?.value;

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

  return NextResponse.json({ ok: true });
}
