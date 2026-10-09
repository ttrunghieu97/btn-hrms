'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { PayrollRunStatusBadge } from './payroll-run-status-badge';
import type { PayrollRun, PayrollRunStatus } from '../types';
import {
  useGeneratePayrollRunMutation,
  useRequestApprovalPayrollRunMutation,
  useApprovePayrollRunMutation,
  useRejectPayrollRunMutation,
  usePostPayrollRunMutation,
} from '../queries/payroll-run-queries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PayrollRunWorkflowHeroProps {
  run: PayrollRun;
}

const STEPS = [
  { key: 'draft', label: '1. Khởi tạo' },
  { key: 'processing', label: '2. Tính toán & Xử lý' },
  { key: 'approved', label: '3. Phê duyệt' },
  { key: 'posted', label: '4. Chốt & Xuất lương' },
];

export function PayrollRunWorkflowHero({ run }: PayrollRunWorkflowHeroProps) {
  const generateMutation = useGeneratePayrollRunMutation();
  const requestApprovalMutation = useRequestApprovalPayrollRunMutation();
  const approveMutation = useApprovePayrollRunMutation();
  const rejectMutation = useRejectPayrollRunMutation();
  const postMutation = usePostPayrollRunMutation();

  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const status: PayrollRunStatus = run.status || 'draft';

  let activeIndex = 0;
  if (status === 'draft') activeIndex = 0;
  else if (status === 'processing') activeIndex = 1;
  else if (status === 'approved') activeIndex = 2;
  else if (status === 'posted') activeIndex = 3;

  const isPending =
    generateMutation.isPending ||
    requestApprovalMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    postMutation.isPending;

  const nextActorInfo = React.useMemo(() => {
    switch (status) {
      case 'draft':
        return {
          actor: 'Chuyên viên tiền lương',
          action: 'Kiểm tra thông số cấu hình và nhấn Tính toán phiếu lương để hệ thống tổng hợp công, phụ cấp và bảo hiểm.',
        };
      case 'processing':
        return {
          actor: 'Kế toán trưởng / Giám đốc Nhân sự',
          action: 'Kiểm tra đối soát các phiếu lương cá nhân. Nếu số liệu chính xác, nhấn Phê duyệt hoặc Từ chối để tính lại.',
        };
      case 'approved':
        return {
          actor: 'Kế toán trưởng / Bộ phận Chi trả',
          action: 'Bảng lương đã được phê duyệt. Nhấn Chốt & Xuất lương để hoàn tất chi trả và phát hành phiếu lương cho nhân viên.',
        };
      case 'posted':
        return {
          actor: 'Đã hoàn tất quy trình',
          action: 'Bảng lương đã chốt vĩnh viễn và không thể chỉnh sửa. Phiếu lương đã sẵn sàng để nhân viên tra cứu.',
        };
      case 'cancelled':
        return {
          actor: 'Bảng lương đã hủy',
          action: 'Bảng lương đã bị hủy bỏ bởi quản trị viên.',
        };
      default:
        return {
          actor: 'Bộ phận Tiền lương',
          action: 'Theo dõi tiến độ xử lý bảng lương.',
        };
    }
  }, [status]);

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) return;
    rejectMutation.mutate(
      { id: run.id, reason: rejectReason },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectReason('');
        },
      }
    );
  };

  return (
    <>
      <Card className='border-primary/20 bg-card shadow-sm'>
        <CardContent className='p-6'>
          {/* Header Row */}
          <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
            <div>
              <div className='flex items-center gap-2.5'>
                <h2 className='text-xl font-bold tracking-tight text-foreground'>
                  Bảng lương {run.payrollPeriod?.name || run.payrollPeriod?.code || run.id.slice(0, 8)}
                </h2>
                <PayrollRunStatusBadge status={status} />
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Mã kỳ lương: <span className='font-medium text-foreground'>{run.payrollPeriod?.code || '—'}</span>
                {' • '}
                Ghi chú: <span className='font-medium text-foreground'>{run.notes || 'Không có'}</span>
              </p>
            </div>

            {/* Actions for current state */}
            <div className='flex flex-wrap items-center gap-2'>
              {status === 'draft' && (
                <>
                  <Button
                    size='sm'
                    variant='default'
                    className='h-8 text-xs font-medium gap-1.5'
                    disabled={isPending}
                    onClick={() => generateMutation.mutate(run.id)}
                  >
                    {isPending && <Icons.spinner className='size-3.5 animate-spin' />}
                    <Icons.check className='size-3.5' />
                    Tính toán phiếu lương
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 text-xs font-medium gap-1.5'
                    disabled={isPending}
                    onClick={() => requestApprovalMutation.mutate(run.id)}
                  >
                    Trình duyệt bảng lương
                  </Button>
                </>
              )}

              {status === 'processing' && (
                <>
                  <Button
                    size='sm'
                    variant='default'
                    className='h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium gap-1.5'
                    disabled={isPending}
                    onClick={() => approveMutation.mutate(run.id)}
                  >
                    {isPending && <Icons.spinner className='size-3.5 animate-spin' />}
                    <Icons.check className='size-3.5' />
                    Phê duyệt bảng lương
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    className='h-8 text-xs font-medium gap-1.5'
                    disabled={isPending}
                    onClick={() => setRejectOpen(true)}
                  >
                    <Icons.close className='size-3.5' />
                    Từ chối
                  </Button>
                </>
              )}

              {status === 'approved' && (
                <Button
                  size='sm'
                  variant='default'
                  className='h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium gap-1.5'
                  disabled={isPending}
                  onClick={() => postMutation.mutate(run.id)}
                >
                  {isPending && <Icons.spinner className='size-3.5 animate-spin' />}
                  <Icons.check className='size-3.5' />
                  Chốt & Xuất lương (Post)
                </Button>
              )}
            </div>
          </div>

          {/* Stepper Pipeline */}
          <div className='mt-6 border-t border-border pt-4'>
            <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3'>
              Tiến trình nghiệp vụ bảng lương (Payroll Workflow Stepper)
            </p>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
              {STEPS.map((step, idx) => {
                const isDone = idx < activeIndex;
                const isCurrent = idx === activeIndex;

                return (
                  <div
                    key={step.key}
                    className={cn(
                      'flex flex-col gap-1 rounded-lg border p-2 text-xs transition-colors',
                      isDone && 'border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300',
                      isCurrent && 'border-primary bg-primary/5 font-semibold text-primary shadow-xs',
                      !isDone && !isCurrent && 'border-border/60 bg-muted/20 text-muted-foreground opacity-60'
                    )}
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-medium'>{step.label}</span>
                      {isDone && <Icons.check className='size-3 text-emerald-600 dark:text-emerald-400' />}
                      {isCurrent && <span className='size-2 rounded-full bg-primary animate-pulse' />}
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

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold'>
              Từ chối bảng lương
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2 text-xs'>
            <p className='text-muted-foreground'>
              Bảng lương sẽ được hoàn trả về trạng thái Bản nháp để tính toán lại. Vui lòng nhập lý do từ chối:
            </p>
            <Input
              placeholder='Nhập lý do từ chối (ví dụ: Sai lệch số liệu làm thêm giờ)...'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className='text-xs'
            />
            <div className='flex justify-end gap-2 pt-2'>
              <Button variant='ghost' size='sm' onClick={() => setRejectOpen(false)}>
                Hủy
              </Button>
              <Button
                variant='destructive'
                size='sm'
                disabled={!rejectReason.trim() || isPending}
                onClick={handleRejectConfirm}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
