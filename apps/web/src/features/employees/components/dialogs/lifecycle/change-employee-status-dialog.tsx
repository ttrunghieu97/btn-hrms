'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { ApiError } from '@/lib/api-error';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { useChangeEmployeeStatusMutation } from '../../../queries/employee-queries';
import { EmployeeStatusBadge } from '../../display/employee-status-badge';

export type LifecycleStatus =
  | 'working'
  | 'probation'
  | 'terminated'
  | 'leave'
  | 'suspended'
  | 'retired';

interface ChangeEmployeeStatusDialogProps {
  employeeId: string;
  employeeName: string;
  currentStatus: string;
  allowedTransitions?: string[];
  presetTargetStatus?: LifecycleStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STATUS_DETAILS: Record<
  LifecycleStatus,
  { label: string; description: string; actionName: string }
> = {
  working: {
    label: 'Chính thức / Đang làm việc',
    description: 'Nhân viên công tác chính thức, kích hoạt đầy đủ chế độ và quyền lợi.',
    actionName: 'Chuyển chính thức',
  },
  probation: {
    label: 'Thử việc',
    description: 'Thời gian đánh giá năng lực công tác trước khi xét chính thức.',
    actionName: 'Chuyển thử việc',
  },
  leave: {
    label: 'Tạm hoãn hợp đồng / Nghỉ dài hạn',
    description: 'Tạm hoãn thực hiện hợp đồng lao động hoặc nghỉ dài hạn không hưởng lương.',
    actionName: 'Tạm hoãn hợp đồng',
  },
  suspended: {
    label: 'Tạm đình chỉ công tác',
    description: 'Tạm dừng công việc để xác minh hoặc xử lý kỷ luật theo quy định.',
    actionName: 'Đình chỉ công tác',
  },
  retired: {
    label: 'Nghỉ hưu theo chế độ',
    description: 'Chấm dứt quá trình làm việc do đến tuổi nghỉ hưu theo quy định.',
    actionName: 'Nghỉ hưu',
  },
  terminated: {
    label: 'Chấm dứt hợp đồng',
    description: 'Nghỉ việc và kết thúc quan hệ lao động với công ty.',
    actionName: 'Chấm dứt hợp đồng',
  },
};

function todayString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

export function ChangeEmployeeStatusDialog({
  employeeId,
  employeeName,
  currentStatus,
  allowedTransitions = [],
  presetTargetStatus,
  open,
  onOpenChange,
  onSuccess,
}: ChangeEmployeeStatusDialogProps) {
  const queryClient = useQueryClient();

  // Exclude 'terminated' from this dialog because termination requires lastWorkingDate (use TerminateEmployeeDialog instead)
  const selectableStatuses = React.useMemo(() => {
    const list = allowedTransitions.filter(
      (s): s is LifecycleStatus => s in STATUS_DETAILS && s !== 'terminated',
    );
    if (presetTargetStatus && !list.includes(presetTargetStatus)) {
      list.push(presetTargetStatus);
    }
    return list;
  }, [allowedTransitions, presetTargetStatus]);

  const defaultStatus = presetTargetStatus ?? selectableStatuses[0] ?? 'working';

  const [targetStatus, setTargetStatus] = React.useState<LifecycleStatus>(defaultStatus);
  const [effectiveDate, setEffectiveDate] = React.useState<string>(todayString());
  const [reason, setReason] = React.useState<string>('');

  React.useEffect(() => {
    if (open) {
      setTargetStatus(presetTargetStatus ?? selectableStatuses[0] ?? 'working');
      setEffectiveDate(todayString());
      setReason('');
    }
  }, [open, presetTargetStatus, selectableStatuses]);

  const changeStatusMutation = useChangeEmployeeStatusMutation(queryClient, {
    onSuccess: () => {
      toast.success(
        presetTargetStatus === 'working' && currentStatus === 'probation'
          ? `Đã kích hoạt chuyển nhân viên ${employeeName} thành chính thức thành công.`
          : `Đã cập nhật trạng thái nhân viên thành công.`,
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(getVietnameseApiErrorMessage(error, 'Không thể thay đổi trạng thái nhân viên'));
      } else {
        toast.error('Có lỗi xảy ra khi thay đổi trạng thái nhân viên');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus || !effectiveDate) return;

    changeStatusMutation.mutate({
      id: employeeId,
      status: targetStatus,
      effectiveDate,
      reason: reason.trim() || undefined,
    });
  };

  const isActivating = targetStatus === 'working' && currentStatus === 'probation';
  const isResuming = targetStatus === 'working' && (currentStatus === 'leave' || currentStatus === 'suspended');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[520px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader className='space-y-2'>
            <div className='flex items-center gap-2'>
              <div className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                {isActivating ? (
                  <Icons.check className='size-5 text-emerald-600' />
                ) : (
                  <Icons.refresh className='size-5' />
                )}
              </div>
              <div>
                <DialogTitle>
                  {isActivating
                    ? 'Chuyển nhân viên chính thức (Activate)'
                    : isResuming
                      ? 'Tiếp nhận nhân viên đi làm lại'
                      : 'Chuyển trạng thái vòng đời nhân viên'}
                </DialogTitle>
                <DialogDescription>
                  Thực hiện bước chuyển trạng thái cho{' '}
                  <span className='font-semibold text-foreground'>{employeeName}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Current vs Target status banner */}
          <div className='mt-4 flex items-center justify-between rounded-xl border bg-muted/40 p-3.5 text-sm'>
            <div className='space-y-1'>
              <span className='text-xs text-muted-foreground'>Trạng thái hiện tại</span>
              <div>
                <EmployeeStatusBadge status={currentStatus} />
              </div>
            </div>

            <Icons.arrowRight className='size-4 text-muted-foreground shrink-0' />

            <div className='space-y-1 text-right'>
              <span className='text-xs text-muted-foreground'>Trạng thái sau khi chuyển</span>
              <div>
                <EmployeeStatusBadge status={targetStatus} />
              </div>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {/* Target Status Selector if not single preset */}
            {selectableStatuses.length > 1 && !presetTargetStatus && (
              <div className='space-y-1.5'>
                <Label htmlFor='target-status'>Trạng thái mục tiêu</Label>
                <Select
                  value={targetStatus}
                  onValueChange={(val) => setTargetStatus(val as LifecycleStatus)}
                >
                  <SelectTrigger id='target-status'>
                    <SelectValue placeholder='Chọn trạng thái' />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableStatuses.map((st) => (
                      <SelectItem key={st} value={st}>
                        {STATUS_DETAILS[st]?.label ?? st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {STATUS_DETAILS[targetStatus] && (
                  <p className='text-xs text-muted-foreground'>
                    {STATUS_DETAILS[targetStatus].description}
                  </p>
                )}
              </div>
            )}

            {/* Effective date */}
            <div className='space-y-1.5'>
              <Label htmlFor='effective-date'>Ngày có hiệu lực</Label>
              <Input
                id='effective-date'
                type='date'
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
              <p className='text-xs text-muted-foreground'>
                Ngày quyết định bắt đầu có hiệu lực trong hồ sơ nhân sự.
              </p>
            </div>

            {/* Reason / Decision */}
            <div className='space-y-1.5'>
              <Label htmlFor='reason'>
                Căn cứ / Lý do quyết định{' '}
                <span className='text-muted-foreground font-normal'>(Khuyến nghị)</span>
              </Label>
              <Textarea
                id='reason'
                rows={3}
                placeholder={
                  isActivating
                    ? 'Ví dụ: Căn cứ Quyết định số 45/QĐ-BTN, nhân viên đạt yêu cầu thử việc 2 tháng...'
                    : 'Nhập căn cứ, số quyết định hoặc lý do điều chuyển...'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Context callout */}
            <div className='rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground'>
              <p className='font-medium text-foreground'>Lưu ý về quy trình:</p>
              <p className='mt-0.5'>
                Hệ thống sẽ cập nhật trạng thái nhân viên, lưu vết vào Nhật ký vòng đời và đồng
                bộ với các quy trình chấm công, tính lương và phân quyền liên quan.
              </p>
            </div>
          </div>

          <DialogFooter className='mt-6 gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={changeStatusMutation.isPending}
            >
              {commonUiCopy.cancel}
            </Button>
            <Button
              type='submit'
              disabled={changeStatusMutation.isPending || !effectiveDate}
              className={isActivating ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            >
              {changeStatusMutation.isPending && (
                <Icons.spinner className='mr-2 size-4 animate-spin' />
              )}
              {isActivating
                ? 'Xác nhận chuyển chính thức'
                : isResuming
                  ? 'Xác nhận đi làm lại'
                  : 'Xác nhận chuyển trạng thái'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
