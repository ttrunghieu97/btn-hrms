import AuthSessionGate from '@/components/auth/auth-session-gate';
import AuthStoreHydrator from '@/components/auth/auth-store-hydrator';
import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { pageCopy, routeLabels } from '@/lib/app-copy';
import { appLogger } from '@/lib/logger';
import { requireServerSession } from '@/lib/server/auth-session';
import { getAccessCookieName } from '@/lib/env.server';
import { requirePagePermission } from '@/features/authorization';
import { fetchNav, navKeys } from '@/features/nav';
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';

export const metadata: Metadata = {
  title: routeLabels.dashboard,
  description: pageCopy.dashboard.defaultDescription,
  robots: {
    index: false,
    follow: false
  }
};

const ACCESS_COOKIE_NAME = getAccessCookieName();

function resolveAccessTokenRemainingSeconds(rawToken?: string): number | undefined {
  if (!rawToken) return undefined;
  const parts = rawToken.split('.');
  if (parts.length !== 3 || !parts[1]) return undefined;
  try {
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      exp?: unknown;
    };
    if (typeof decoded?.exp === 'number' && Number.isFinite(decoded.exp)) {
      const remainingSec = Math.floor(decoded.exp - Date.now() / 1000);
      return Math.max(remainingSec, 15);
    }
  } catch {
    // ignore malformed JWT payload
  }
  return undefined;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, initialUser] = await Promise.all([cookies(), requireServerSession()]);
  const accessTokenExpiresInSec = resolveAccessTokenRemainingSeconds(
    cookieStore.get(ACCESS_COOKIE_NAME)?.value
  );

  // SSR permission check — secondary enforcement behind middleware
  const h = await headers();
  const pathname = h.get('next-url') ?? h.get('x-forwarded-path') ?? '';
  if (pathname) {
    requirePagePermission(pathname, initialUser);
  }
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  appLogger.debug('auth_session_seeded', {
    source: 'ssr-layout',
    path: '/(protected)',
    userId: initialUser.id,
  });

  let initialNavData = undefined;
  const queryClient = new QueryClient();
  try {
    const cookieHeader = cookieStore.toString();
    initialNavData = await fetchNav({ headers: { cookie: cookieHeader } });
    queryClient.setQueryData([...navKeys.all(), initialUser.id], initialNavData);
  } catch {
    // Fail silently on server nav prefetch error; client query will handle fallback
  }

  return (
    <KBar>
      <AuthStoreHydrator user={initialUser} expiresInSec={accessTokenExpiresInSec}>
        <AuthSessionGate initialUser={initialUser}>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <SidebarProvider defaultOpen={defaultOpen}>
              <AppSidebar initialNavData={initialNavData} />
              <SidebarInset className='h-screen flex flex-col overflow-hidden'>
                <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </HydrationBoundary>
        </AuthSessionGate>
      </AuthStoreHydrator>
    </KBar>
  );
}
