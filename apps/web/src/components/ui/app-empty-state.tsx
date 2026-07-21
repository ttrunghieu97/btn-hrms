'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
  /** role="status" for live-region announcements */
  announce?: boolean;
}

/**
 * Shared empty state for all features.
 *
 * Usage:
 * ```tsx
 * <AppEmptyState
 *   icon={<Icons.calendar className='size-10' />}
 *   title={shiftUiCopy.assignments.empty}
 *   description="Create your first shift assignment."
 *   action={<Button onClick={...}>Create</Button>}
 * />
 * ```
 */
export function AppEmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
  announce = true,
}: AppEmptyStateProps) {
  return (
    <div
      role={announce ? 'status' : undefined}
      className={cn(
        'text-muted-foreground flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'py-6' : 'py-12',
        className
      )}
    >
      {icon ? (
        <div className='text-muted-foreground/50'>{icon}</div>
      ) : null}
      <div className='space-y-1'>
        <p className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>
          {title}
        </p>
        {description ? (
          <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className='pt-1'>{action}</div> : null}
    </div>
  );
}
