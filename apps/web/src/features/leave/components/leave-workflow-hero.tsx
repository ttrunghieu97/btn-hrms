'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { Icons } from '@/components/icons';
import { formatDateVN } from '@/lib/date';
import { leaveUiCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';

const LEAVE_STATUS_MAP: StatusMap = {
  draft: { label: leaveUiCopy.statusDraft, variant: 'outline' },
  pending: { label: leaveUiCopy.statusPending, variant: 'secondary' },
  approved: { label: leaveUiCopy.statusApproved, variant: 'default' },
  rejected: { label: leaveUiCopy.statusRejected, variant: 'destructive' },
  cancelled: { label: leaveUiCopy.statusCancelled, variant: 'outline' },
};

interface LeaveWorkflowHeroProps {
  id: string;
  employeeName?: string;
  leaveTypeName?: string;
  startDate?: string;
  endDate?: string;
  totalUnits?: string;
  status: string;
  reason?: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  isActionPending?: boolean;
  canApprove?: boolean;
  canCancel?: boolean;
}

export function LeaveWorkflowHero({
  employeeName,
  leaveTypeName,
  startDate,
  endDate,
  totalUnits,
  status,
  reason,
  onApprove,
  onReject,
  onCancel,
  isActionPending = false,
  canApprove = false,
  canCancel = false,
}: LeaveWorkflowHeroProps) {
  // Stepper calculations
  const steps = [
    { key: 'create', label: '1. Tạo đơn' },
    { key: 'submitted', label: '2. Gửi duyệt' },
    { key: 'review', label: '3. Xét duyệt' },
    { key: 'completed', label: '4. Cấn trừ & Hoàn tất' },
  ];

  let activeIndex = 0;
  if (status === 'draft') activeIndex = 0;
  else if (status === 'pending') activeIndex = 2;
  else if (status === 'approved') activeIndex = 4;
  else if (status === 'rejected' || status === 'cancelled') activeIndex = 3;

  const nextActorInfo = React.useMemo(() => {
    switch (status) {
      case 'draft':
        return {
          actor: 'Nhân viên (Người gửi)',
          action: 'Kiểm tra thông tin và gửi đơn xin nghỉ để chuyển sang trạng thái chờ duyệt.',
        };
      case 'pending':
        return {
          actor: 'Quản lý trực tiếp / Ban Nhân sự',
          action: 'Xem xét số dư ngày phép, lý do và quyết định Phê duyệt hoặc Từ chối đơn.',
        };
      case 'approved':
        return {
          actor: 'Hệ thống HRMS & Bảng chấm công',
          action: 'Đơn đã duyệt thành công. Ngày công và quỹ phép của nhân viên đã được cập nhật tự động.',
        };
      case 'rejected':
        return {
          actor: 'Nhân viên (Người gửi)',
          action: 'Đơn bị từ chối. Nhân viên có thể tạo đơn mới với thời gian hoặc lý do phù hợp hơn.',
        };
      case 'cancelled':
        return {
          actor: 'Quy trình đã kết thúc',
          action: 'Đơn đã hủy bởi người dùng hoặc quản trị viên.',
        };
      default:
        return {
          actor: 'Ban Nhân sự',
          action: 'Theo dõi tiến trình xử lý đơn nghỉ phép.',
        };
    }
  }, [status]);

  const dateRangeText = startDate && endDate
    ? `${formatDateVN(startDate)} → ${formatDateVN(endDate)}`
    : '—';

  return (
    <Card className='border-primary/20 bg-card shadow-sm'>
      <CardContent className='p-6'>
        {/* Top Header Row */}
        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-xl font-bold tracking-tight text-foreground'>
                {employeeName || 'Nhân viên'}
              </h2>
              <StatusBadge status={status} mapping={LEAVE_STATUS_MAP} />
            </div>
            <p className='text-muted-foreground mt-1 text-sm'>
              Loại phép: <span className='font-medium text-foreground'>{leaveTypeName || 'Nghỉ phép'}</span>
              {' • '}
              Thời gian: <span className='font-medium text-foreground'>{dateRangeText}</span>
              {' • '}
              Tổng cộng: <span className='font-medium text-foreground'>{totalUnits || '1'} ngày</span>
            </p>
            {reason && (
              <p className='text-muted-foreground mt-2 text-xs italic bg-muted/40 rounded p-2'>
                &ldquo;{reason}&rdquo;
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className='flex flex-wrap items-center gap-2'>
            {status === 'pending' && canApprove && (
              <>
                <Button
                  size='sm'
                  variant='default'
                  className='bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5'
                  onClick={onApprove}
                  disabled={isActionPending}
                >
                  <Icons.check className='size-4' />
                  Phê duyệt
                </Button>
                <Button
                  size='sm'
                  variant='destructive'
                  className='font-medium gap-1.5'
                  onClick={onReject}
                  disabled={isActionPending}
                >
                  <Icons.close className='size-4' />
                  Từ chối
                </Button>
              </>
            )}

            {(status === 'pending' || status === 'draft') && canCancel && (
              <Button
                size='sm'
                variant='outline'
                className='font-medium text-muted-foreground hover:text-destructive'
                onClick={onCancel}
                disabled={isActionPending}
              >
                Hủy đơn
              </Button>
            )}
          </div>
        </div>

        {/* Workflow Stepper Pipeline */}
        <div className='mt-6 border-t border-border pt-4'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3'>
            Tiến trình xét duyệt nghiệp vụ (Workflow Pipeline)
          </p>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
            {steps.map((step, idx) => {
              const isDone = idx < activeIndex;
              const isCurrent = idx === activeIndex || (status === 'approved' && idx === 3);
              const isFailed = (status === 'rejected' || status === 'cancelled') && idx === 2;

              return (
                <div
                  key={step.key}
                  className={cn(
                    'flex flex-col gap-1 rounded-lg border p-2.5 text-xs transition-colors',
                    isDone && 'border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300',
                    isCurrent && !isFailed && 'border-primary bg-primary/5 font-semibold text-primary shadow-sm',
                    isFailed && 'border-destructive/40 bg-destructive/5 text-destructive font-semibold',
                    !isDone && !isCurrent && !isFailed && 'border-border/60 bg-muted/20 text-muted-foreground opacity-60'
                  )}
                >
                  <div className='flex items-center justify-between'>
                    <span className='font-medium'>{step.label}</span>
                    {isDone && <Icons.check className='size-3 text-emerald-600 dark:text-emerald-400' />}
                    {isCurrent && !isFailed && (
                      <span className='size-2 rounded-full bg-primary animate-pulse' />
                    )}
                    {isFailed && <Icons.close className='size-3 text-destructive' />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Actor Guidance Callout */}
        <div className='mt-4 flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 p-3.5 text-xs'>
          <Icons.activity className='size-4 text-primary shrink-0 mt-0.5' />
          <div className='flex-1'>
            <div className='flex items-center gap-2 font-medium text-foreground'>
              <span>Người xử lý tiếp theo:</span>
              <span className='rounded bg-primary/10 px-1.5 py-0.5 text-primary text-[11px] font-semibold'>
                {nextActorInfo.actor}
              </span>
            </div>
            <p className='mt-1 text-muted-foreground leading-relaxed'>
              {nextActorInfo.action}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
