/**
 * LoadingState — standardized loading display.
 *
 * Variants:
 *   spinner  → centered spinner with optional text (default)
 *   skeleton → full page skeleton
 *   page     → full-page centered spinner (for page transitions)
 *   inline   → inline spinner (for tables, cards)
 *
 * Usage:
 *   <LoadingState />
 *   <LoadingState variant='skeleton' title='Loading employees...' />
 *   <LoadingState variant='page' />
 *   <LoadingState variant='inline' />
 */
'use client';

import { Spinner } from '@/components/ui/spinner';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { commonUiCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';

type LoadingVariant = 'spinner' | 'skeleton' | 'page' | 'inline';

interface LoadingStateProps {
  variant?: LoadingVariant;
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingState({
  variant = 'spinner',
  title,
  description,
  className,
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return <PageSkeleton className={className} />;
  }

  if (variant === 'inline') {
    return (
      <div
        className={cn('flex items-center justify-center gap-2 py-8', className)}
        role='status'
        aria-live='polite'
      >
        <Spinner className='text-muted-foreground size-4' />
        {title && <span className='text-muted-foreground text-xs'>{title}</span>}
      </div>
    );
  }

  // spinner | page — both centered, page is just larger
  const isPage = variant === 'page';

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3',
        isPage ? 'min-h-[60vh]' : 'py-16',
        className,
      )}
      role='status'
      aria-live='polite'
    >
      <Spinner className={cn('text-muted-foreground', isPage ? 'size-10' : 'size-8')} />
      {title && (
        <p className='text-muted-foreground text-sm font-medium'>{title}</p>
      )}
      {description && (
        <p className='text-muted-foreground/60 text-xs'>{description}</p>
      )}
      <span className='sr-only'>{title ?? commonUiCopy.loadingLabel}</span>
    </div>
  );
}
