'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { getPreferredLandingRoute } from '@/lib/auth-landing';
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
    return getPreferredLandingRoute(user);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        {/* Shield Icon with glowing animation */}
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Icons.shield className="size-8" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          Truy cập bị từ chối
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {appShellCopy.accessDenied}
        </p>

        {/* Detailed Permission Warning */}
        {(missingPermission || missingAnyOf) && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-left text-xs text-destructive">
            <div className="flex items-start gap-2">
              <Icons.warning className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Yêu cầu quyền truy cập:</p>
                <code className="mt-1 block font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border text-foreground break-all">
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
            className="w-full"
          >
            <Icons.logo className="mr-2 size-4" />
            Về trang chủ của bạn
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex-1"
            >
              <Icons.refresh className="mr-2 size-4" />
              Quay lại
            </Button>

            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="ghost"
              className="flex-1"
            >
              {isSigningOut ? (
                <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
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
        <p className="mt-6 text-[11px] text-muted-foreground/70">
          Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ với bộ phận Quản trị hệ thống (IT Support) để được cấp quyền.
        </p>
      </div>
    </div>
  );
}
