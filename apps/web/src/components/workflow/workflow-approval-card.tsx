'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface WorkflowApprovalCardProps {
  id: string;
  title: string;
  subtitle?: string;
  requester?: string;
  dateRange?: string;
  reason?: string | null;
  tags?: string[];
  onApprove?: () => void;
  onReject?: () => void;
  onViewDetail?: () => void;
  isPending?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
  className?: string;
}

export function WorkflowApprovalCard({
  id: _id,
  title,
  subtitle,
  requester,
  dateRange,
  reason,
  tags = [],
  onApprove,
  onReject,
  onViewDetail,
  isPending = false,
  approveLabel = 'Duyệt',
  rejectLabel = 'Từ chối',
  className,
}: WorkflowApprovalCardProps) {
  return (
    <Card className={cn('border border-border bg-card shadow-xs transition-shadow hover:shadow-sm', className)}>
      <CardContent className='p-3.5 space-y-2.5 text-xs'>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <div className='font-bold text-foreground text-sm leading-tight'>{title}</div>
            {requester && (
              <div className='text-[11px] text-muted-foreground mt-0.5'>
                Người gửi: <span className='font-medium text-foreground'>{requester}</span>
              </div>
            )}
          </div>
          {tags.map((tag, idx) => (
            <Badge key={idx} variant='secondary' className='text-[10px] shrink-0 font-medium'>
              {tag}
            </Badge>
          ))}
        </div>

        {subtitle && (
          <p className='text-muted-foreground text-[11px]'>{subtitle}</p>
        )}

        {dateRange && (
          <div className='flex items-center gap-1.5 text-muted-foreground text-[11px]'>
            <Icons.calendar className='size-3 text-primary shrink-0' />
            <span>{dateRange}</span>
          </div>
        )}

        {reason && (
          <p className='line-clamp-2 rounded bg-muted/30 p-2 text-[11px] text-muted-foreground italic border border-border/40'>
            &ldquo;{reason}&rdquo;
          </p>
        )}

        <div className='flex items-center justify-between gap-2 border-t border-border/60 pt-2 mt-2'>
          {onViewDetail && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
              onClick={onViewDetail}
            >
              <Icons.eye className='mr-1 size-3' />
              Chi tiết luồng
            </Button>
          )}

          <div className='flex items-center gap-1.5 ml-auto'>
            {onApprove && (
              <Button
                variant='default'
                size='sm'
                className='h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 font-medium'
                disabled={isPending}
                onClick={onApprove}
              >
                {isPending ? (
                  <Icons.spinner className='mr-1 size-3 animate-spin' />
                ) : (
                  <Icons.check className='mr-1 size-3' />
                )}
                {approveLabel}
              </Button>
            )}

            {onReject && (
              <Button
                variant='destructive'
                size='sm'
                className='h-7 px-2.5 text-xs font-medium'
                disabled={isPending}
                onClick={onReject}
              >
                {rejectLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
