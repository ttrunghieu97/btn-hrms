'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { formatDateVN } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  usePeriodLockQuery,
  usePeriodHistoryQuery,
  usePeriodActionMutation,
  type PeriodLockData,
} from '../../api/period-lock-api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface AttendancePeriodLifecycleHeroProps {
  period: string; // format 'yyyy-MM'
}

export function AttendancePeriodLifecycleHero({ period }: AttendancePeriodLifecycleHeroProps) {
  const { data: lockData, isLoading } = usePeriodLockQuery(period);
  const { data: history = [], refetch: refetchHistory } = usePeriodHistoryQuery(period);
  const actionMutation = usePeriodActionMutation();

  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [remarkInput, setRemarkInput] = React.useState('');
  const [promptAction, setPromptAction] = React.useState<'unlock' | 'close' | null>(null);

  const status: PeriodLockData['status'] = lockData?.status || 'draft';

  const steps = [
    { key: 'draft', label: '1. Thu thập chấm công' },
    { key: 'in_review', label: '2. Rà soát & Đề xuất' },
    { key: 'locked', label: '3. Phê duyệt & Khóa' },
    { key: 'closed', label: '4. Chốt kỳ & Chuyển lương' },
  ];

  let activeIndex = 0;
  if (status === 'draft') activeIndex = 0;
  else if (status === 'in_review') activeIndex = 1;
  else if (status === 'locked') activeIndex = 2;
  else if (status === 'closed') activeIndex = 3;

  const nextActorInfo = React.useMemo(() => {
    switch (status) {
      case 'draft':
        return {
          actor: 'Chuyên viên chấm công / Trưởng nhóm',
          action: 'Kiểm tra giải quyết ngoại lệ (đi muộn/về sớm/thiếu chấm công), sau đó chuyển kỳ công sang trạng thái Xét duyệt.',
        };
      case 'in_review':
        return {
          actor: 'HR Manager / Trưởng bộ phận',
          action: 'Rà soát tổng công, giải trình nhân viên và thực hiện Phê duyệt & Khóa bảng công để chuẩn bị tính lương.',
        };
      case 'locked':
        return {
          actor: 'Kế toán tiền lương / Giám đốc nhân sự',
          action: 'Bảng công đã khóa chỉnh sửa. Tiến hành đối soát với lương hoặc Chốt kỳ công để hoàn tất chu kỳ.',
        };
      case 'closed':
        return {
          actor: 'Đã hoàn tất quy trình',
          action: 'Kỳ công đã chốt vĩnh viễn. Dữ liệu công đã chuyển sang Bảng lương (Payroll Period).',
        };
      default:
        return {
          actor: 'Ban Nhân sự',
          action: 'Theo dõi tiến độ chấm công định kỳ.',
        };
    }
  }, [status]);

  const handleAction = (action: 'review' | 'lock' | 'approve' | 'close' | 'unlock' | 'reopen', remarks?: string) => {
    actionMutation.mutate({
      action,
      period,
      remarks,
    }, {
      onSuccess: () => {
        setPromptAction(null);
        setRemarkInput('');
      }
    });
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'draft':
        return <Badge variant='outline' className='bg-muted/40 text-muted-foreground'>Bản nháp</Badge>;
      case 'in_review':
        return <Badge variant='secondary' className='bg-amber-500/10 text-amber-700 dark:text-amber-400'>Đang xét duyệt</Badge>;
      case 'locked':
        return <Badge variant='default' className='bg-emerald-600 text-white'>Đã khóa bảng công</Badge>;
      case 'closed':
        return <Badge variant='outline' className='border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'>Đã chốt kỳ</Badge>;
      default:
        return <Badge variant='outline'>Bản nháp</Badge>;
    }
  };

  return (
    <>
      <Card className='border-primary/20 bg-card shadow-sm'>
        <CardContent className='p-5'>
          {/* Top Row: Period Title + Status + Action Triggers */}
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-bold tracking-tight text-foreground'>
                  Quy trình kỳ công: Tháng {period}
                </h3>
                {isLoading ? <Icons.spinner className='size-3.5 animate-spin' /> : getStatusBadge()}
              </div>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Chu kỳ chấm công, xác nhận giờ công và chuyển giao dữ liệu tính lương
              </p>
            </div>

            {/* Actions for current state */}
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                className='text-xs text-muted-foreground hover:text-foreground h-8'
                onClick={() => {
                  refetchHistory();
                  setHistoryOpen(true);
                }}
              >
                <Icons.activity className='mr-1 size-3.5' />
                Lịch sử kỳ ({history.length})
              </Button>

              {status === 'draft' && (
                <Button
                  size='sm'
                  variant='default'
                  className='h-8 text-xs font-medium gap-1'
                  disabled={actionMutation.isPending}
                  onClick={() => handleAction('review')}
                >
                  <Icons.check className='size-3.5' />
                  Chuyển xét duyệt (Review)
                </Button>
              )}

              {status === 'in_review' && (
                <Button
                  size='sm'
                  variant='default'
                  className='h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium gap-1'
                  disabled={actionMutation.isPending}
                  onClick={() => handleAction('approve')}
                >
                  <Icons.check className='size-3.5' />
                  Phê duyệt & Khóa công (Lock)
                </Button>
              )}

              {status === 'locked' && (
                <>
                  <Button
                    size='sm'
                    variant='default'
                    className='h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium gap-1'
                    disabled={actionMutation.isPending}
                    onClick={() => setPromptAction('close')}
                  >
                    <Icons.check className='size-3.5' />
                    Chốt kỳ công (Close)
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 text-xs text-muted-foreground hover:text-foreground'
                    disabled={actionMutation.isPending}
                    onClick={() => setPromptAction('unlock')}
                  >
                    Mở khóa
                  </Button>
                </>
              )}

              {status === 'closed' && (
                <Button
                  size='sm'
                  variant='outline'
                  className='h-8 text-xs text-muted-foreground'
                  disabled={actionMutation.isPending}
                  onClick={() => handleAction('reopen', 'Mở lại kỳ để điều chỉnh')}
                >
                  Mở lại kỳ (Reopen)
                </Button>
              )}
            </div>
          </div>

          {/* Stepper Pipeline */}
          <div className='mt-5 border-t border-border pt-3.5'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
              {steps.map((step, idx) => {
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

          {/* Responsible Actor Guidance */}
          <div className='mt-3.5 flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs'>
            <Icons.activity className='size-4 text-primary shrink-0 mt-0.5' />
            <div className='flex-1'>
              <div className='flex items-center gap-2 font-medium text-foreground'>
                <span>Người chịu trách nhiệm tiếp theo:</span>
                <span className='rounded bg-primary/10 px-1.5 py-0.5 text-primary text-[11px] font-semibold'>
                  {nextActorInfo.actor}
                </span>
              </div>
              <p className='mt-0.5 text-muted-foreground text-[11px] leading-relaxed'>
                {nextActorInfo.action}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation modal for unlock / close with reason */}
      {promptAction && (
        <Dialog open={Boolean(promptAction)} onOpenChange={() => setPromptAction(null)}>
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-base font-bold'>
                {promptAction === 'close' ? 'Xác nhận chốt kỳ công' : 'Xác nhận mở khóa kỳ công'}
              </DialogTitle>
            </DialogHeader>
            <div className='space-y-3 py-2 text-xs'>
              <p className='text-muted-foreground'>
                {promptAction === 'close'
                  ? 'Sau khi chốt kỳ công, dữ liệu giờ công sẽ trở thành chính thức để lập bảng lương. Vui lòng nhập ghi chú nếu có.'
                  : 'Mở khóa sẽ cho phép tiếp tục chỉnh sửa chấm công trong kỳ này. Vui lòng nêu rõ lý do.'}
              </p>
              <Input
                placeholder='Nhập lý do / ghi chú...'
                value={remarkInput}
                onChange={(e) => setRemarkInput(e.target.value)}
                className='text-xs'
              />
              <div className='flex justify-end gap-2 pt-2'>
                <Button variant='ghost' size='sm' onClick={() => setPromptAction(null)}>
                  Hủy
                </Button>
                <Button
                  variant='default'
                  size='sm'
                  disabled={actionMutation.isPending}
                  onClick={() => handleAction(promptAction, remarkInput || undefined)}
                >
                  Xác nhận
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className='max-w-lg max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold'>
              Lịch sử chuyển đổi kỳ công ({period})
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            {history.length === 0 ? (
              <p className='text-xs text-muted-foreground text-center py-6'>
                Chưa có nhật ký chuyển trạng thái cho kỳ công này.
              </p>
            ) : (
              history.map((record) => (
                <div key={record.id} className='rounded-lg border border-border/70 p-3 text-xs space-y-1 bg-card'>
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-foreground uppercase text-[11px]'>
                      Hành động: {record.action}
                    </span>
                    <span className='text-[10px] text-muted-foreground'>
                      {record.performedAt ? formatDateVN(record.performedAt) : '—'}
                    </span>
                  </div>
                  <div className='text-muted-foreground text-[11px] flex items-center gap-1.5'>
                    <span>Chuyển từ:</span>
                    <Badge variant='outline' className='text-[10px] h-4'>{record.fromStatus}</Badge>
                    <span>→</span>
                    <Badge variant='outline' className='text-[10px] h-4 font-semibold text-primary'>{record.toStatus}</Badge>
                  </div>
                  {record.remarks && (
                    <p className='text-muted-foreground text-[11px] italic bg-muted/40 p-1.5 rounded'>
                      &ldquo;{record.remarks}&rdquo;
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
