'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { commonUiCopy, attendanceUiCopy } from '@/lib/app-copy';
import { toDateString } from '../../utils/attendance-utils';
import { toast } from 'sonner';
import { useManualCorrectionMutation } from '../../api/timekeeping-queries';
import { employeesQueryOptions } from '@/features/employees';
import type { EmployeeResponseDto } from '@/api/generated/model';

interface CorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CorrectionDialog({ open, onOpenChange }: CorrectionDialogProps) {
  const employeesQuery = useQuery(employeesQueryOptions({ limit: 500 }));
  const correctionMutation = useManualCorrectionMutation();

  const [employeeId, setEmployeeId] = React.useState('');
  const [type, setType] = React.useState<'check_in' | 'check_out'>('check_in');
  const [workDate, setWorkDate] = React.useState(toDateString(new Date()));
  const [time, setTime] = React.useState('08:00');
  const [reason, setReason] = React.useState('');
  const [note, setNote] = React.useState('');

  const employees = React.useMemo(() => {
    return employeesQuery.data?.employees ?? [];
  }, [employeesQuery.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !reason) {
      toast.error(attendanceUiCopy.timekeeping.createAdjustDialog.toastValidation);
      return;
    }

    const eventTime = new Date(`${workDate}T${time}:00`).toISOString();

    correctionMutation.mutate(
      {
        employeeId,
        type,
        workDate,
        eventTime,
        reason,
        note: note || reason,
      },
      {
        onSuccess: () => {
          toast.success(attendanceUiCopy.timekeeping.createAdjustDialog.toastSuccess);
          onOpenChange(false);
          setEmployeeId('');
          setReason('');
          setNote('');
        },
        onError: (err: Error) => {
          toast.error(err?.message || attendanceUiCopy.timekeeping.createAdjustDialog.toastError);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[450px]'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <DialogHeader>
            <DialogTitle>{attendanceUiCopy.timekeeping.createAdjustDialog.title}</DialogTitle>
            <DialogDescription>
              {attendanceUiCopy.timekeeping.createAdjustDialog.description}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='employee'>{attendanceUiCopy.timekeeping.createAdjustDialog.employeeLabel}</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger id='employee'>
                  <SelectValue placeholder={attendanceUiCopy.timekeeping.createAdjustDialog.selectEmployeePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: EmployeeResponseDto) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.id.slice(0, 8)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='type'>{attendanceUiCopy.timekeeping.createAdjustDialog.eventTypeLabel}</Label>
                <Select value={type} onValueChange={(val: 'check_in' | 'check_out') => setType(val)}>
                  <SelectTrigger id='type'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='check_in'>{attendanceUiCopy.timekeeping.createAdjustDialog.checkInOption}</SelectItem>
                    <SelectItem value='check_out'>{attendanceUiCopy.timekeeping.createAdjustDialog.checkOutOption}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex flex-col gap-2'>
                <Label htmlFor='session'>{attendanceUiCopy.timekeeping.createAdjustDialog.sessionLabel}</Label>
                <div className='text-xs text-muted-foreground pt-2'>{attendanceUiCopy.timekeeping.createAdjustDialog.sessionAuto}</div>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='workDate'>{attendanceUiCopy.timekeeping.createAdjustDialog.workDateLabel}</Label>
                <Input
                  id='workDate'
                  type='date'
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  required
                />
              </div>

              <div className='flex flex-col gap-2'>
                <Label htmlFor='time'>{attendanceUiCopy.timekeeping.createAdjustDialog.timeLabel}</Label>
                <Input
                  id='time'
                  type='time'
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <Label htmlFor='reason'>{attendanceUiCopy.timekeeping.createAdjustDialog.reasonLabel}</Label>
              <Textarea
                id='reason'
                placeholder={attendanceUiCopy.timekeeping.createAdjustDialog.reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
              />
            </div>

            <div className='flex flex-col gap-2'>
              <Label htmlFor='note'>{attendanceUiCopy.timekeeping.createAdjustDialog.noteLabel}</Label>
              <Textarea
                id='note'
                placeholder={attendanceUiCopy.timekeeping.createAdjustDialog.notePlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={correctionMutation.isPending}
            >
              {commonUiCopy.cancel}
            </Button>
            <Button type='submit' disabled={correctionMutation.isPending}>
              {correctionMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
              {commonUiCopy.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
