'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface AgendaViewSwitcherProps {
  mode: 'agenda' | 'matrix';
  onModeChange: (mode: 'agenda' | 'matrix') => void;
  agendaLabel?: string;
  matrixLabel?: string;
  className?: string;
}

/**
 * Switcher between mobile-optimized Agenda (List) View and Matrix (Table) View.
 * Touch target >= 44px on mobile, full keyboard navigation support.
 */
export function AgendaViewSwitcher({
  mode,
  onModeChange,
  agendaLabel = 'Lịch trình',
  matrixLabel = 'Ma trận',
  className,
}: AgendaViewSwitcherProps) {
  return (
    <div
      role='tablist'
      aria-label='Chế độ hiển thị'
      className={cn(
        'inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-1 shadow-2xs',
        className
      )}
    >
      <button
        type='button'
        role='tab'
        aria-selected={mode === 'agenda'}
        aria-label={`Chế độ xem ${agendaLabel}`}
        onClick={() => onModeChange('agenda')}
        className={cn(
          'inline-flex min-h-[44px] sm:min-h-[36px] items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          mode === 'agenda'
            ? 'bg-background text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Icons.calendar className='size-4 shrink-0' />
        <span>{agendaLabel}</span>
      </button>

      <button
        type='button'
        role='tab'
        aria-selected={mode === 'matrix'}
        aria-label={`Chế độ xem ${matrixLabel}`}
        onClick={() => onModeChange('matrix')}
        className={cn(
          'inline-flex min-h-[44px] sm:min-h-[36px] items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          mode === 'matrix'
            ? 'bg-background text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Icons.table className='size-4 shrink-0' />
        <span>{matrixLabel}</span>
      </button>
    </div>
  );
}

export interface AgendaGroupProps {
  title: string;
  subTitle?: string;
  isToday?: boolean;
  count?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Group container representing a date bucket in an agenda.
 */
export function AgendaGroup({
  title,
  subTitle,
  isToday = false,
  count,
  children,
  className,
}: AgendaGroupProps) {
  return (
    <section
      aria-label={title}
      className={cn('flex flex-col gap-2.5', className)}
    >
      <div className='flex items-center justify-between border-b border-border/60 pb-1.5 pt-1'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-semibold tracking-tight text-foreground'>
            {title}
          </h3>
          {subTitle && (
            <span className='text-xs text-muted-foreground'>{subTitle}</span>
          )}
          {isToday && (
            <Badge
              variant='default'
              className='bg-primary text-primary-foreground text-[10px] px-1.5 py-0 font-medium'
            >
              Hôm nay
            </Badge>
          )}
        </div>
        {typeof count === 'number' && (
          <span className='text-xs font-mono text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5'>
            {count}
          </span>
        )}
      </div>

      <div className='flex flex-col gap-2'>{children}</div>
    </section>
  );
}

export interface AgendaItemProps {
  title: React.ReactNode;
  subTitle?: React.ReactNode;
  timeRange?: React.ReactNode;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  details?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Single card representing a scheduled shift or attendance entry.
 * Designed with mobile touch ergonomics: touch target >= 44px, full card clickable if onClick provided.
 */
export function AgendaItem({
  title,
  subTitle,
  timeRange,
  badge,
  avatar,
  details,
  actions,
  onClick,
  selected = false,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: AgendaItemProps) {
  const isInteractive = Boolean(onClick) && !disabled;

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 shadow-2xs transition-all',
        isInteractive &&
          'cursor-pointer active:scale-[0.99] hover:border-primary/40 hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        selected && 'border-primary ring-1 ring-primary bg-primary/5',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <div className='flex items-start justify-between gap-2.5'>
        <div className='flex items-center gap-2.5 min-w-0 flex-1'>
          {avatar && <div className='shrink-0'>{avatar}</div>}
          <div className='flex flex-col min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <span className='font-medium text-sm text-foreground truncate'>
                {title}
              </span>
            </div>
            {subTitle && (
              <span className='text-xs text-muted-foreground truncate'>
                {subTitle}
              </span>
            )}
          </div>
        </div>

        <div className='flex items-center gap-1.5 shrink-0'>
          {badge}
        </div>
      </div>

      {(timeRange || details) && (
        <div className='flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-xs text-muted-foreground'>
          {timeRange && (
            <div className='inline-flex items-center gap-1 font-mono text-foreground font-medium'>
              <Icons.clock className='size-3.5 text-muted-foreground shrink-0' />
              <span>{timeRange}</span>
            </div>
          )}
          {details && <div className='flex items-center gap-2 flex-wrap'>{details}</div>}
        </div>
      )}

      {actions && (
        <div
          onClick={(e) => e.stopPropagation()}
          className='flex items-center justify-end gap-2 border-t border-border/40 pt-2'
        >
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Mobile Agenda skeleton loader.
 */
export function AgendaSkeleton({ groups = 3, itemsPerGroup = 2 }: { groups?: number; itemsPerGroup?: number }) {
  return (
    <div className='flex flex-col gap-6 animate-pulse p-1'>
      {Array.from({ length: groups }).map((_, gIdx) => (
        <div key={gIdx} className='flex flex-col gap-3'>
          <div className='flex items-center justify-between border-b border-border/60 pb-2'>
            <div className='h-4 w-36 bg-muted rounded' />
            <div className='h-4 w-8 bg-muted rounded-full' />
          </div>
          <div className='flex flex-col gap-2'>
            {Array.from({ length: itemsPerGroup }).map((_, iIdx) => (
              <div
                key={iIdx}
                className='h-24 w-full rounded-xl border border-border/60 bg-muted/20 p-3'
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
