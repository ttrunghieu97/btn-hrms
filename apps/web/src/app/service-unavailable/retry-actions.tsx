'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { serviceUnavailablePageCopy } from '@/locales/vi/system-ui';
import { useAuthStore } from '@/stores/auth-store';

export default function RetryActions() {
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);
  const [isPending, startTransition] = React.useTransition();
  const [isLoggingOut, startLogout] = React.useTransition();

  const handleLogout = () => {
    startLogout(async () => {
      await signOut();
      router.push('/auth/sign-in');
    });
  };

  return (
    <div className='flex flex-col gap-3 sm:flex-row'>
      <Button
        type='button'
        onClick={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
        isLoading={isPending}
      >
        <Icons.refresh />
        {serviceUnavailablePageCopy.retry}
      </Button>

      <Button asChild type='button' variant='outline'>
        <Link href='/'>{serviceUnavailablePageCopy.backToHome}</Link>
      </Button>

      <Button
        type='button'
        variant='ghost'
        onClick={handleLogout}
        isLoading={isLoggingOut}
        className='text-destructive hover:bg-destructive/10 hover:text-destructive'
      >
        <Icons.logout />
        {serviceUnavailablePageCopy.signOut}
      </Button>
    </div>
  );
}
