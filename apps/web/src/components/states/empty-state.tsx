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

import * as React from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type EmptyVariant = 'default' | 'search' | 'filtered' | 'permission' | 'not-found' | 'offline';

export interface EmptyStateProps {
  variant?: EmptyVariant;
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode | {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  announce?: boolean;
  className?: string;
}

const variantConfig: Record<EmptyVariant, { icon: ReactNode; defaultTitle: string; defaultDescription: string }> = {
  default: {
    icon: <Icons.product className='size-10' />,
    defaultTitle: 'Không có dữ liệu',
    defaultDescription: 'Chưa có dữ liệu nào.',
  },
  search: {
    icon: <Icons.search className='size-10' />,
    defaultTitle: 'Không tìm thấy kết quả',
    defaultDescription: 'Thử điều chỉnh từ khóa hoặc bộ lọc.',
  },
  filtered: {
    icon: <Icons.adjustments className='size-10' />,
    defaultTitle: 'Không có kết quả phù hợp',
    defaultDescription: 'Thử thay đổi bộ lọc.',
  },
  permission: {
    icon: <Icons.shield className='size-10' />,
    defaultTitle: 'Không có quyền truy cập',
    defaultDescription: 'Bạn không có quyền xem dữ liệu này.',
  },
  'not-found': {
    icon: <Icons.search className='size-10' />,
    defaultTitle: 'Không tìm thấy',
    defaultDescription: 'Trang hoặc dữ liệu không tồn tại.',
  },
  offline: {
    icon: <Icons.slash className='size-10' />,
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
  compact = false,
  announce = true,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const effectiveTitle = title ?? config.defaultTitle;
  const effectiveDescription = description ?? config.defaultDescription;

  const renderAction = () => {
    if (!action) return null;
    if (React.isValidElement(action)) {
      return <div className='pt-1'>{action}</div>;
    }
    if (typeof action === 'object' && 'label' in action && 'onClick' in action) {
      return (
        <Button variant='outline' size='sm' onClick={action.onClick}>
          {action.label}
        </Button>
      );
    }
    return <div className='pt-1'>{action as ReactNode}</div>;
  };

  return (
    <div
      role={announce ? 'status' : undefined}
      className={cn(
        'text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center',
        compact ? 'py-6' : 'py-12',
        className
      )}
    >
      <div className='text-muted-foreground/40'>{icon ?? config.icon}</div>
      <div className='space-y-1'>
        <p className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>
          {effectiveTitle}
        </p>
        {effectiveDescription ? (
          <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
            {effectiveDescription}
          </p>
        ) : null}
      </div>
      {renderAction()}
    </div>
  );
}
