'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { navGroups } from '@/config/nav-config';
import { filterNavItems } from '@/hooks/use-nav';
import { appShellCopy } from '@/locales/vi/system-ui';

export default function UnauthorizedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [isSigningOut, startSignOut] = React.useTransition();

  const missingPermission = searchParams.get('missing');
  const missingAnyOf = searchParams.get('missingAnyOf');

  // Dynamically determine the best landing page based on user permissions
  const getLandingPage = React.useCallback(() => {
    if (!user) return '/auth/sign-in';
    const allowedItems = filterNavItems(
      navGroups.flatMap((g) => g.items),
      user
    );
    if (allowedItems.length > 0 && allowedItems[0].url) {
      return allowedItems[0].url;
    }
    return '/account/profile'; // Fallback to profile page which is always safe
  }, [user]);

  const handleGoHome = () => {
    router.replace(getLandingPage());
  };

  const handleSignOut = () => {
    startSignOut(async () => {
      try {
        await signOut();
      } finally {
        router.replace('/auth/sign-in');
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-200">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center shadow-2xl backdrop-blur-md">
        {/* Shield Icon with glowing animation */}
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <Icons.shield className="size-8" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Truy cập bị từ chối
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          {appShellCopy.accessDenied}
        </p>

        {/* Detailed Permission Warning */}
        {(missingPermission || missingAnyOf) && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-left text-xs text-red-400">
            <div className="flex items-start gap-2">
              <Icons.warning className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Yêu cầu quyền truy cập:</p>
                <code className="mt-1 block font-mono text-[11px] bg-black/35 px-1.5 py-0.5 rounded border border-white/5 break-all">
                  {missingPermission || missingAnyOf}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleGoHome}
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200"
          >
            <Icons.logo className="mr-2 size-4" />
            Về trang chủ của bạn
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex-1 border-zinc-800 text-zinc-300 hover:bg-white/5"
            >
              <Icons.refresh className="mr-2 size-4" />
              Quay lại
            </Button>

            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="ghost"
              className="flex-1 text-zinc-400 hover:text-white hover:bg-white/5"
            >
              {isSigningOut ? (
                <span className="size-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
              ) : (
                <>
                  <Icons.logout className="mr-2 size-4" />
                  Đăng xuất
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Help text */}
        <p className="mt-6 text-[11px] text-zinc-600">
          Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ với bộ phận Quản trị hệ thống (IT Support) để được cấp quyền.
        </p>
      </div>
    </div>
  );
}
