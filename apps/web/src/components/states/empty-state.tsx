/**
 * EmptyState — standardized empty/not-found/offline display.
 *
 * Variants:
 *   default    → generic "no data"
 *   search     → search returned no results
 *   filtered   → filters returned nothing
 *   permission → no access to this resource
 *   not-found  → resource not found
 *   offline    → network unavailable
 *
 * Usage:
 *   <EmptyState />
 *   <EmptyState variant='search' />
 *   <EmptyState variant='not-found' />
 *   <EmptyState action={{ label: 'Create', onClick: openCreate }} />
 */
'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type EmptyVariant = 'default' | 'search' | 'filtered' | 'permission' | 'not-found' | 'offline';

interface EmptyStateProps {
  variant?: EmptyVariant;
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantConfig: Record<EmptyVariant, { icon: ReactNode; defaultTitle: string; defaultDescription: string }> = {
  default: {
    icon: <Icons.product className='size-12' />,
    defaultTitle: 'Không có dữ liệu',
    defaultDescription: 'Chưa có dữ liệu nào.',
  },
  search: {
    icon: <Icons.search className='size-12' />,
    defaultTitle: 'Không tìm thấy kết quả',
    defaultDescription: 'Thử điều chỉnh từ khóa hoặc bộ lọc.',
  },
  filtered: {
    icon: <Icons.adjustments className='size-12' />,
    defaultTitle: 'Không có kết quả phù hợp',
    defaultDescription: 'Thử thay đổi bộ lọc.',
  },
  permission: {
    icon: <Icons.shield className='size-12' />,
    defaultTitle: 'Không có quyền truy cập',
    defaultDescription: 'Bạn không có quyền xem dữ liệu này.',
  },
  'not-found': {
    icon: <Icons.search className='size-12' />,
    defaultTitle: 'Không tìm thấy',
    defaultDescription: 'Trang hoặc dữ liệu không tồn tại.',
  },
  offline: {
    icon: <Icons.slash className='size-12' />,
    defaultTitle: 'Mất kết nối',
    defaultDescription: 'Vui lòng kiểm tra kết nối mạng.',
  },
};

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-1 flex-col items-center justify-center gap-4 py-16',
        className,
      )}
    >
      <div className='text-muted-foreground/40'>{icon ?? config.icon}</div>
      <div className='space-y-1 text-center'>
        <p className='text-sm font-medium'>{title ?? config.defaultTitle}</p>
        <p className='text-xs'>{description ?? config.defaultDescription}</p>
      </div>
      {action && (
        <Button variant='outline' size='sm' onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
