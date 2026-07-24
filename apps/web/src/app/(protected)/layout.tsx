import AuthSessionGate from '@/components/auth/auth-session-gate';
import AuthStoreHydrator from '@/components/auth/auth-store-hydrator';
import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { pageCopy, routeLabels } from '@/lib/app-copy';
import { appLogger } from '@/lib/logger';
import { requireServerSession } from '@/lib/server/auth-session';
import { fetchNav } from '@/features/nav/api/nav-api';
import { navKeys } from '@/features/nav/hooks/useNav';
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: routeLabels.dashboard,
  description: pageCopy.dashboard.defaultDescription,
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, initialUser] = await Promise.all([cookies(), requireServerSession()]);
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
      <AuthStoreHydrator user={initialUser}>
        <AuthSessionGate initialUser={initialUser}>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <SidebarProvider defaultOpen={defaultOpen}>
              <AppSidebar initialNavData={initialNavData} />
              <SidebarInset className='h-screen flex flex-col overflow-hidden'>
                <div className='flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 pb-0 md:px-6 md:pt-6 md:pb-0'>
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
