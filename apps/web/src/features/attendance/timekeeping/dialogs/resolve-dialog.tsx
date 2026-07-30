'use client';

import * as React from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { commonUiCopy, attendanceUiCopy } from '@/lib/app-copy';
import { toast } from 'sonner';
import { useResolveExceptionMutation } from '../../api/timekeeping-queries';
import type { ExceptionItem } from '../types';

interface ResolveDialogProps {
  exception: ExceptionItem | null;
  onClose: () => void;
}

export function ResolveDialog({ exception, onClose }: ResolveDialogProps) {
  const resolveMutation = useResolveExceptionMutation();
  const [status, setStatus] = React.useState<'resolved' | 'closed'>('resolved');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (exception) {
      setStatus('resolved');
      setNote('');
    }
  }, [exception]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exception) return;
    resolveMutation.mutate(
      {
        id: exception.id,
        data: {
          status,
          note,
        },
      },
      {
        onSuccess: () => {
          toast.success(attendanceUiCopy.timekeeping.resolveDialog.toastSuccess);
          onClose();
        },
        onError: (err: Error) => {
          toast.error(err?.message || attendanceUiCopy.timekeeping.resolveDialog.toastError);
        },
      }
    );
  };

  return (
    <Dialog open={!!exception} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <DialogHeader>
            <DialogTitle>{attendanceUiCopy.timekeeping.resolveDialog.title}</DialogTitle>
            <DialogDescription>
              {attendanceUiCopy.timekeeping.resolveDialog.description
                .replace('{date}', exception?.date ?? exception?.workDate ?? '--')
                .replace('{name}', exception?.employeeName ?? (exception?.employee?.firstName ? `${exception.employee.firstName} ${exception.employee.lastName}` : '--'))}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='exception-type'>{attendanceUiCopy.timekeeping.resolveDialog.typeLabel}</Label>
              <div className='text-sm font-medium'>
                {exception?.type ?? exception?.exceptionType ?? exception?.reason ?? '--'}
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <Label htmlFor='resolve-status'>{attendanceUiCopy.timekeeping.resolveDialog.solutionLabel}</Label>
              <Select
                value={status}
                onValueChange={(val: string) => setStatus(val as 'resolved' | 'closed')}
              >
                <SelectTrigger id='resolve-status'>
                  <SelectValue placeholder={attendanceUiCopy.timekeeping.resolveDialog.selectStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='resolved'>{attendanceUiCopy.timekeeping.resolveDialog.optionResolved}</SelectItem>
                  <SelectItem value='closed'>{attendanceUiCopy.timekeeping.resolveDialog.optionClosed}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-2'>
              <Label htmlFor='resolve-note'>{attendanceUiCopy.timekeeping.resolveDialog.noteLabel}</Label>
              <Textarea
                id='resolve-note'
                placeholder={attendanceUiCopy.timekeeping.resolveDialog.notePlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={resolveMutation.isPending}>
              {commonUiCopy.cancel}
            </Button>
            <Button type='submit' disabled={resolveMutation.isPending}>
              {resolveMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
              {commonUiCopy.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
