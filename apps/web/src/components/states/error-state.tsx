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

function httpErrorVariant(error: { status?: number; code?: string; message?: string }): ErrorVariant | null {
  const status = error.status;
  if (status === 401) return 'default';
  if (status === 403) return 'permission';
  if (status === 404) return 'not-found';
  if (status === 429) return 'server-error';
  if (status && status >= 500) return 'server-error';
  return null;
}

function isNetworkError(error: { code?: string; message?: string }): boolean {
  if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR') return true;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('network') || msg.includes('fetch') || msg.includes('abort');
}

export function ErrorState({ error, onRetry, variant = 'default', subject, capture = true, className }: ErrorStateProps) {
  // If actual error exists, try to auto-map or delegate to AppErrorState
  if (error) {
    const httpVariant = httpErrorVariant(error);
    if (httpVariant || isNetworkError(error)) {
      // Show preset fallback for known HTTP/network errors
      const fb = variantFallback[httpVariant ?? 'offline'];
      const icon = httpVariant === 'permission' ? <Icons.shield className='text-destructive/60 size-12' />
        : httpVariant === 'not-found' ? <Icons.search className='text-muted-foreground/40 size-12' />
        : <Icons.alertCircle className='text-destructive/60 size-12' />;

      return (
        <div className={cn('text-muted-foreground flex flex-1 flex-col items-center justify-center gap-4 py-16', className)}>
          {icon}
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

    // Fall through to AppErrorState for errors with actual error messages
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
