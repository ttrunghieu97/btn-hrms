'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import * as React from 'react';

export default function NoPermissionsPage() {
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);
  const [isSigningOut, startSignOut] = React.useTransition();

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
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <Icons.warning className="size-8" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Tài khoản chưa được phân quyền
        </h1>
        <p className="text-sm text-zinc-400 mb-2">
          Bạn đã đăng nhập thành công nhưng tài khoản chưa được cấp quyền
          truy cập vào hệ thống.
        </p>
        <p className="text-xs text-zinc-500 mb-8">
          Vui lòng liên hệ Quản trị hệ thống (IT Support) để được cấp quyền.
        </p>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSignOut}
            disabled={isSigningOut}
            variant="outline"
            className="w-full border-zinc-800 text-zinc-300 hover:bg-white/5"
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
    </div>
  );
}
