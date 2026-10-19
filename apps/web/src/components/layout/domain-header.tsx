'use client';

import * as React from 'react';
import { DomainTabs, type DomainTab } from '@/components/layout/domain-tabs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface DomainHeaderProps {
  tabs?: DomainTab[];
  title?: string;
  className?: string;
}

/**
 * DomainHeader — sticky header bar combining sidebar trigger + domain tabs or page title.
 * Full-width, sticks to top, separates navigation from content.
 */
export function DomainHeader({ tabs = [], title, className }: DomainHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex min-h-11 items-center gap-2 border-b border-border bg-background px-4 md:px-6',
        className
      )}
    >
      <SidebarTrigger className='size-8 shrink-0' />
      {tabs.length > 0 ? (
        <DomainTabs tabs={tabs} className='flex-1 min-w-0' />
      ) : title ? (
        <span className='truncate text-sm font-semibold text-foreground'>{title}</span>
      ) : null}
    </div>
  );
}
