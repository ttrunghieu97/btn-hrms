'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { employeeKeys } from '../../../api/queries';
import { ApiError } from '@/lib/api-error';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import {
  scheduleEmployeeTermination,
  terminateEmployee,
} from '../../../api/employee-lifecycle';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission } from '@project/permissions';
import { permissions } from '@/lib/permissions';

interface TerminateEmployeeDialogProps {
  employeeId: string;
  employeeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type TerminationMode = 'immediate' | 'scheduled';

interface FormState {
  mode: TerminationMode;
  reason: string;
  effectiveDate: string;
  lastWorkingDate: string;
}

function todayString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

function nextWeekString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

export function TerminateEmployeeDialog({
  employeeId,
  employeeName,
  open,
  onOpenChange,
  onSuccess,
}: TerminateEmployeeDialogProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userPermissions = user?.permissions ?? [];
  const canScheduleTerminate = Boolean(
    user?.isSuperAdmin ||
      userPermissions.includes('ALL') ||
      userPermissions.includes('sys:all') ||
      hasAnyPermission(userPermissions, [
        permissions.employees.manage,
        permissions.employees.manageSensitive,
      ]),
  );

  const [form, setForm] = React.useState<FormState>({
    mode: 'immediate',
    reason: '',
    effectiveDate: todayString(),
    lastWorkingDate: todayString(),
  });

  const handleModeChange = (mode: TerminationMode) => {
    if (mode === 'scheduled' && !canScheduleTerminate) return;
    const defaultDate = mode === 'scheduled' ? nextWeekString() : todayString();
    setForm((prev) => ({
      ...prev,
      mode,
      effectiveDate: defaultDate,
      lastWorkingDate: defaultDate,
    }));
  };

  const terminateMutation = useMutation({
    mutationFn: async (payload: {
      mode: TerminationMode;
      reason: string;
      effectiveDate: string;
      lastWorkingDate?: string;
    }) => {
      if (payload.mode === 'scheduled') {
        return scheduleEmployeeTermination(employeeId, {
          reason: payload.reason,
          effectiveDate: payload.effectiveDate,
          lastWorkingDate: payload.lastWorkingDate,
        });
      }
      return terminateEmployee(employeeId, {
        reason: payload.reason,
        effectiveDate: payload.effectiveDate,
        lastWorkingDate: payload.lastWorkingDate,
      });
    },
    onSuccess: (_data, vars) => {
      if (vars.mode === 'scheduled') {
        toast.success(`Đã lên lịch chấm dứt hợp đồng cho ${employeeName} vào ngày ${vars.effectiveDate}.`);
      } else {
        toast.success(employeeUiCopy.lifecycle.successMessage);
      }
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.workflowInstances(employeeId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.boardingStatus(employeeId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.statusHistory(employeeId) });
      handleClose();
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(getVietnameseApiErrorMessage(error, employeeUiCopy.lifecycle.errorMessage));
      } else {
        toast.error(employeeUiCopy.lifecycle.errorMessage);
      }
    },
  });

  const handleClose = () => {
    setForm({
      mode: 'immediate',
      reason: '',
      effectiveDate: todayString(),
      lastWorkingDate: todayString(),
    });
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!form.reason.trim() || !form.effectiveDate || !form.lastWorkingDate) return;
    terminateMutation.mutate({
      mode: form.mode,
      reason: form.reason.trim(),
      effectiveDate: form.effectiveDate,
      lastWorkingDate: form.lastWorkingDate,
    });
  };

  const effectiveDateInvalid = !form.effectiveDate;
  const scheduledInPast =
    form.mode === 'scheduled' && Boolean(form.effectiveDate) && form.effectiveDate <= todayString();
  const lastWorkingDateInvalid = !form.lastWorkingDate;
  const dateOrderInvalid =
    form.effectiveDate &&
    form.lastWorkingDate &&
    form.lastWorkingDate > form.effectiveDate;
  const reasonInvalid = !form.reason.trim();
  const isValid =
    !effectiveDateInvalid &&
    !scheduledInPast &&
    !lastWorkingDateInvalid &&
    !dateOrderInvalid &&
    !reasonInvalid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{employeeUiCopy.lifecycle.terminateTitle}</DialogTitle>
          <DialogDescription>
            {employeeUiCopy.lifecycle.employeeLabel}{' '}
            <span className='font-medium'>{employeeName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Mode selector */}
          <div className='grid grid-cols-2 gap-2 rounded-lg border p-1 bg-muted/40'>
            <button
              type='button'
              onClick={() => handleModeChange('immediate')}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                form.mode === 'immediate'
                  ? 'bg-destructive text-destructive-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chấm dứt ngay lập tức
            </button>
            <button
              type='button'
              disabled={!canScheduleTerminate}
              title={
                !canScheduleTerminate
                  ? 'Chỉ Quản lý Nhân sự (HR Manager) mới có quyền hẹn ngày chấm dứt hợp đồng'
                  : undefined
              }
              onClick={() => handleModeChange('scheduled')}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                form.mode === 'scheduled'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : !canScheduleTerminate
                    ? 'cursor-not-allowed opacity-50 text-muted-foreground'
                    : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hẹn ngày chấm dứt (Scheduled)
            </button>
          </div>

          {/* Warning box */}
          {form.mode === 'immediate' ? (
            <Alert variant='destructive'>
              <Icons.warning className='size-4' />
              <AlertDescription>
                <p>{employeeUiCopy.lifecycle.warningTitle}</p>
                <ul className='mt-2 list-disc space-y-1 pl-5 text-sm'>
                  {employeeUiCopy.lifecycle.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
                <p className='mt-2 text-sm font-medium'>
                  {employeeUiCopy.lifecycle.warningFooter}
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Icons.clock className='size-4 text-amber-600' />
              <AlertDescription className='text-xs'>
                <p className='font-medium text-foreground'>
                  Lên lịch chấm dứt hợp đồng trong tương lai:
                </p>
                <p className='mt-1 text-muted-foreground'>
                  Nhân viên vẫn duy trì trạng thái đang làm việc cho đến ngày hiệu lực. Đến ngày hẹn,
                  Job tự động sẽ chuyển trạng thái nghỉ việc, khởi tạo quy trình Offboarding và thu hồi
                  quyền truy cập. Bạn có thể huỷ lịch hẹn bất cứ lúc nào trước ngày hiệu lực.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Reason */}
          <div className='space-y-1.5'>
            <Label
              htmlFor='terminate-reason'
              className='after:text-destructive after:ml-0.5 after:content-["*"]'
            >
              {employeeUiCopy.lifecycle.reasonLabel}
            </Label>
            <Textarea
              id='terminate-reason'
              placeholder={employeeUiCopy.lifecycle.terminateReasonPlaceholder}
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              rows={3}
            />
            {reasonInvalid && (
              <p className='text-destructive text-xs'>{employeeUiCopy.lifecycle.reasonRequired}</p>
            )}
          </div>

          {/* Effective Date */}
          <div className='space-y-1.5'>
            <Label
              htmlFor='terminate-effective-date'
              className='after:text-destructive after:ml-0.5 after:content-["*"]'
            >
              {employeeUiCopy.lifecycle.effectiveDateLabel}
            </Label>
            <Input
              id='terminate-effective-date'
              type='date'
              value={form.effectiveDate}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
            />
            {scheduledInPast && (
              <p className='text-destructive text-xs'>
                Ngày hẹn chấm dứt hợp đồng phải là một ngày trong tương lai (&gt; hôm nay).
              </p>
            )}
          </div>

          {/* Last Working Date */}
          <div className='space-y-1.5'>
            <Label
              htmlFor='terminate-last-working-date'
              className='after:text-destructive after:ml-0.5 after:content-["*"]'
            >
              {employeeUiCopy.lifecycle.lastWorkingDateLabel}
            </Label>
            <Input
              id='terminate-last-working-date'
              type='date'
              value={form.lastWorkingDate}
              onChange={(e) => setForm((prev) => ({ ...prev, lastWorkingDate: e.target.value }))}
            />
            {dateOrderInvalid && (
              <p className='text-destructive text-xs'>
                {employeeUiCopy.lifecycle.dateOrderInvalid}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className='gap-2'>
          <Button type='button' variant='outline' onClick={handleClose}>
            {commonUiCopy.cancel}
          </Button>
          <Button
            type='button'
            variant={form.mode === 'immediate' ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={!isValid || terminateMutation.isPending}
          >
            {terminateMutation.isPending ? (
              <>
                <Icons.spinner className='mr-2 size-4 animate-spin' />
                {employeeUiCopy.lifecycle.processing}
              </>
            ) : form.mode === 'scheduled' ? (
              'Xác nhận hẹn ngày chấm dứt'
            ) : (
              employeeUiCopy.lifecycle.confirmTermination
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

