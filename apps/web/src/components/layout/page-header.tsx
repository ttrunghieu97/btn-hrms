'use client';

import * as React from 'react';
import Link from 'next/link';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { InfoButton } from '@/components/ui/info-button';
import type { InfobarContent } from '@/components/ui/infobar';
import { cn } from '@/lib/utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ title: string; link?: string }>;
  hideBreadcrumbs?: boolean;
  showSidebarTrigger?: boolean;
  infoContent?: InfobarContent;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * PageHeader — Canonical enterprise page header following the BTN-HRMS UI/UX standard.
 *
 * Pattern:
 *   Page
 *    └── Page Header
 *         ├── Breadcrumb
 *         ├── Title + Badge/Info
 *         ├── Description
 *         └── Primary Actions
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  hideBreadcrumbs = false,
  showSidebarTrigger = false,
  infoContent,
  actions,
  children,
  className,
  ...props
}: PageHeaderProps) {
  const autoBreadcrumbs = useBreadcrumbs();
  const effectiveBreadcrumbs = breadcrumbs ?? autoBreadcrumbs;

  return (
    <div
      className={cn('flex flex-col gap-2 pb-4', className)}
      data-slot='page-header'
      {...props}
    >
      {!hideBreadcrumbs && effectiveBreadcrumbs.length > 1 && (
        <Breadcrumb className='mb-1 text-xs'>
          <BreadcrumbList>
            {effectiveBreadcrumbs.map((crumb, index) => {
              const isLast = index === effectiveBreadcrumbs.length - 1;
              return (
                <React.Fragment key={`${crumb.title}-${index}`}>
                  <BreadcrumbItem>
                    {isLast || !crumb.link ? (
                      <BreadcrumbPage className='font-medium text-foreground'>
                        {crumb.title}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.link}>{crumb.title}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 items-center gap-3'>
          {showSidebarTrigger && (
            <SidebarTrigger className='size-8 shrink-0 md:hidden' />
          )}
          <div className='min-w-0 space-y-1'>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl truncate'>
                {title}
              </h1>
              {infoContent && (
                <div className='pt-0.5 shrink-0'>
                  <InfoButton content={infoContent} />
                </div>
              )}
            </div>
            {description && (
              <p className='text-sm text-muted-foreground line-clamp-2'>
                {description}
              </p>
            )}
          </div>
        </div>

        {(actions || children) && (
          <div className='flex shrink-0 flex-wrap items-center gap-2 pt-1 sm:pt-0'>
            {actions}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
