import AuthSessionGate from '@/components/auth/auth-session-gate';
import AuthStoreHydrator from '@/components/auth/auth-store-hydrator';
import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { pageCopy, routeLabels } from '@/lib/app-copy';
import { appLogger } from '@/lib/logger';
import { requireServerSession } from '@/lib/server/auth-session';
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

  return (
    <KBar>
      <AuthStoreHydrator user={initialUser}>
        <AuthSessionGate initialUser={initialUser}>
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset>
              <div className='flex min-h-0 flex-1 flex-col'>
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </AuthSessionGate>
      </AuthStoreHydrator>
    </KBar>
  );
}
