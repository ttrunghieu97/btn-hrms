'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface DomainTab {
  href: string;
  label: string;
}

interface DomainTabsProps {
  tabs: DomainTab[];
  className?: string;
}

export function DomainTabs({ tabs, className }: DomainTabsProps) {
  const pathname = usePathname();

  const activeTab = tabs.reduce<DomainTab | undefined>((best, tab) => {
    const matches = pathname === tab.href || pathname.startsWith(tab.href + '/');
    if (matches && (!best || tab.href.length > best.href.length)) {
      return tab;
    }
    return best;
  }, undefined);

  return (
    <nav
      aria-label="Điều hướng phân hệ"
      className={cn('scrollbar-none flex items-center overflow-x-auto border-b border-border', className)}
    >
      <h1 className='sr-only'>{activeTab?.label ?? tabs[0]?.label ?? 'Phân hệ'}</h1>
      {tabs.map((tab) => {
        const isActive = activeTab?.href === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-[2px] whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors hover:text-primary',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
