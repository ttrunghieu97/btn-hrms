/**
 * ErrorState — standardized error display.
 *
 * Auto-maps HTTP errors to user-facing messages:
 *   401 → Authentication required
 *   403 → No permission
 *   404 → Not found
 *   429 → Rate limited
 *   500+ → Server error
 *   Network → Offline
 *
 * Usage:
 *   <ErrorState error={queryError} onRetry={refetch} />
 *   <ErrorState variant='permission' />
 *   <ErrorState variant='not-found' />
 */
'use client';

import { AppErrorState } from '@/components/errors/app-error-state';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

type ErrorVariant = 'default' | 'permission' | 'not-found' | 'offline' | 'server-error';

interface ErrorStateProps {
  error?: Error & { digest?: string; code?: string; status?: number };
  onRetry?: () => void;
  variant?: ErrorVariant;
  subject?: string;
  capture?: boolean;
  className?: string;
}

const variantFallback: Record<ErrorVariant, { title: string; description: string }> = {
  permission: { title: 'Không có quyền truy cập', description: 'Bạn không có quyền truy cập trang này.' },
  'not-found': { title: 'Không tìm thấy', description: 'Trang hoặc dữ liệu không tồn tại.' },
  offline: { title: 'Mất kết nối', description: 'Vui lòng kiểm tra kết nối mạng và thử lại.' },
  'server-error': { title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
  default: { title: 'Có lỗi xảy ra', description: 'Vui lòng thử lại.' },
};

export function ErrorState({ error, onRetry, variant = 'default', subject, capture = true, className }: ErrorStateProps) {
  // When an actual error object is provided, always delegate to AppErrorState
  // so error-taxonomy classification, Sentry reporting, and requestId display run consistently.
  if (error) {
    return (
      <AppErrorState
        error={error}
        reset={onRetry}
        subject={subject}
        layout='panel'
        capture={capture}
        className={className}
      />
    );
  }

  // Preset variant without error object
  const fb = variantFallback[variant];
  return (
    <div className={cn('text-muted-foreground flex flex-1 flex-col items-center justify-center gap-4 py-16', className)}>
      <Icons.alertCircle className='text-destructive/60 size-12' />
      <div className='space-y-1 text-center'>
        <p className='text-sm font-medium'>{fb.title}</p>
        <p className='text-xs'>{fb.description}</p>
      </div>
      {onRetry && (
        <Button variant='outline' size='sm' onClick={onRetry}>
          <Icons.refresh />
          Thử lại
        </Button>
      )}
    </div>
  );
}
