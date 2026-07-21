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
import { terminateEmployee } from '../../../api/employee-lifecycle';

interface TerminateEmployeeDialogProps {
  employeeId: string;
  employeeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormState {
  reason: string;
  effectiveDate: string;
  lastWorkingDate: string;
}

function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function TerminateEmployeeDialog({
  employeeId,
  employeeName,
  open,
  onOpenChange,
  onSuccess,
}: TerminateEmployeeDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<FormState>({
    reason: '',
    effectiveDate: todayString(),
    lastWorkingDate: todayString(),
  });

  const terminateMutation = useMutation({
    mutationFn: async (payload: {
      reason: string;
      effectiveDate: string;
      lastWorkingDate?: string;
    }) => {
      return terminateEmployee(employeeId, payload);
    },
    onSuccess: () => {
      toast.success(employeeUiCopy.lifecycle.successMessage);
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
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
    setForm({ reason: '', effectiveDate: todayString(), lastWorkingDate: todayString() });
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!form.reason.trim() || !form.effectiveDate || !form.lastWorkingDate) return;
    terminateMutation.mutate({
      reason: form.reason.trim(),
      effectiveDate: form.effectiveDate,
      lastWorkingDate: form.lastWorkingDate,
    });
  };

  const effectiveDateInvalid = !form.effectiveDate;
  const lastWorkingDateInvalid = !form.lastWorkingDate;
  const dateOrderInvalid =
    form.effectiveDate &&
    form.lastWorkingDate &&
    form.lastWorkingDate > form.effectiveDate;
  const reasonInvalid = !form.reason.trim();
  const isValid = !effectiveDateInvalid && !lastWorkingDateInvalid && !dateOrderInvalid && !reasonInvalid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{employeeUiCopy.lifecycle.terminateTitle}</DialogTitle>
          <DialogDescription>
            {employeeUiCopy.lifecycle.employeeLabel} <span className='font-medium'>{employeeName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Warning box */}
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

          {/* Reason */}
          <div className='space-y-1.5'>
            <Label htmlFor='terminate-reason' className='after:ml-0.5 after:text-destructive after:content-["*"]'>
              {employeeUiCopy.lifecycle.reasonLabel}
            </Label>
            <Textarea
              id='terminate-reason'
              placeholder={employeeUiCopy.lifecycle.terminateReasonPlaceholder}
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              rows={3}
            />
            {reasonInvalid && <p className='text-destructive text-xs'>{employeeUiCopy.lifecycle.reasonRequired}</p>}
          </div>

          {/* Effective Date */}
          <div className='space-y-1.5'>
            <Label htmlFor='terminate-effective-date' className='after:ml-0.5 after:text-destructive after:content-["*"]'>
              {employeeUiCopy.lifecycle.effectiveDateLabel}
            </Label>
            <Input
              id='terminate-effective-date'
              type='date'
              value={form.effectiveDate}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
            />
          </div>

          {/* Last Working Date */}
          <div className='space-y-1.5'>
            <Label htmlFor='terminate-last-working-date' className='after:ml-0.5 after:text-destructive after:content-["*"]'>
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
            variant='destructive'
            onClick={handleSubmit}
            disabled={!isValid || terminateMutation.isPending}
          >
            {terminateMutation.isPending ? (
              <>
                <Icons.spinner className='mr-2 size-4 animate-spin' />
                {employeeUiCopy.lifecycle.processing}
              </>
            ) : (
              employeeUiCopy.lifecycle.confirmTermination
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
