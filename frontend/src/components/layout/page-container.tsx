import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { appShellCopy } from '@/locales/vi/system-ui';

export default function PageContainer({
  children,
  scrollable = false,
  access = true,
  accessFallback,
}: {
  children: React.ReactNode;
  scrollable?: boolean;
  access?: boolean;
  accessFallback?: React.ReactNode;
}) {
  if (!access) {
    return (
      <div className='flex flex-1 items-center justify-center'>
        {accessFallback ?? (
          <div className='text-muted-foreground text-center text-lg'>
            {appShellCopy.accessDenied}
          </div>
        )}
      </div>
    );
  }

  const inner = (
    <div className='rpi-page-container flex min-h-0 flex-1 flex-col'>
      {children}
    </div>
  );

  if (scrollable) {
    return <ScrollArea className='h-[calc(100dvh-64px)]'>{inner}</ScrollArea>;
  }

  return <div className='flex h-[calc(100dvh-64px)] min-h-0 flex-col'>{inner}</div>;
}
