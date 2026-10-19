'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { extractList } from "@/lib/api-extract";
import { leaveTypesQueryOptions } from '../api/queries';
import { useCreateLeaveRequest } from '../api/mutations';
import type { CreateLeaveRequestDto } from '@/api/generated/model';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { commonUiCopy, leaveUiCopy } from '@/lib/app-copy';

interface CreateLeaveRequestDialogProps {
  employeeId?: string;
  children?: React.ReactNode;
}

export function CreateLeaveRequestDialog({ employeeId, children }: CreateLeaveRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: employeeId ?? '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    startSession: 'full_day' as 'full_day' | 'morning' | 'afternoon',
    endSession: 'full_day' as 'full_day' | 'morning' | 'afternoon',
    totalUnits: '',
    reason: '',
  });

  useEffect(() => {
    if (employeeId) {
      setForm((prev) => (prev.employeeId === employeeId ? prev : { ...prev, employeeId }));
    }
  }, [employeeId]);

  useEffect(() => {
    if (!form.startDate || !form.endDate) return;
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return;
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    let units = diffDays;
    if (diffDays === 1) {
      units = form.startSession === 'full_day' ? 1 : 0.5;
    } else {
      if (form.startSession !== 'full_day') units -= 0.5;
      if (form.endSession !== 'full_day') units -= 0.5;
    }
    const nextUnits = String(Math.max(0.5, units));
    setForm((prev) => (prev.totalUnits === nextUnits ? prev : { ...prev, totalUnits: nextUnits }));
  }, [form.startDate, form.endDate, form.startSession, form.endSession]);

  const { data: typesData } = useQuery(leaveTypesQueryOptions());
  const createLeave = useCreateLeaveRequest();

  async function handleCreate() {
    setValidationError(null);
    const resolvedEmployeeId = form.employeeId || employeeId || '';
    if (!resolvedEmployeeId) {
      setValidationError('Không xác định được hồ sơ nhân viên.');
      return;
    }
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !form.totalUnits) {
      setValidationError('Vui lòng nhập đầy đủ loại nghỉ, ngày bắt đầu, ngày kết thúc và số ngày.');
      return;
    }
    if (form.endDate < form.startDate) {
      setValidationError('Ngày kết thúc không được nhỏ hơn ngày bắt đầu.');
      return;
    }
    const parsedUnits = Number(form.totalUnits);
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      setValidationError('Số ngày nghỉ phải lớn hơn 0.');
      return;
    }

    const dto: CreateLeaveRequestDto = {
      employeeId: resolvedEmployeeId,
      leaveTypeId: form.leaveTypeId,
      startDate: form.startDate,
      endDate: form.endDate,
      startSession: form.startSession,
      endSession: form.endSession,
      totalUnits: form.totalUnits,
      reason: form.reason || undefined,
    };
    try {
      await createLeave.mutateAsync({ data: dto });
      setOpen(false);
      setForm({
        employeeId: employeeId ?? '',
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        startSession: 'full_day',
        endSession: 'full_day',
        totalUnits: '',
        reason: '',
      });
    } catch {
      // Handled by useCreateLeaveRequest onError notification
    }
  }

  const types = extractList<{ id: string; name: string }>(typesData);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? <Button size='sm'>{leaveUiCopy.createRequest}</Button>}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{leaveUiCopy.createRequest}</DialogTitle>
          <DialogDescription>Điền thông tin đơn xin nghỉ phép để gửi phê duyệt.</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          {validationError && (
            <div role='alert' className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
              {validationError}
            </div>
          )}
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='leave-start-date'>{"Ngày bắt đầu"}</Label>
              <Input
                id='leave-start-date'
                type='date'
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='leave-end-date'>{"Ngày kết thúc"}</Label>
              <Input
                id='leave-end-date'
                type='date'
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='leave-type-id'>{'Loại nghỉ'}</Label>
              <Select
                value={form.leaveTypeId}
                onValueChange={(v) => setForm({ ...form, leaveTypeId: v })}
              >
                <SelectTrigger id='leave-type-id'>
                  <SelectValue placeholder='Chọn loại nghỉ' />
                </SelectTrigger>
                <SelectContent>
                  {(types as Array<{ id: string; name: string }>)?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='leave-total-units'>{'Số ngày'}</Label>
              <Input
                id='leave-total-units'
                type='text'
                placeholder='1.0'
                value={form.totalUnits}
                onChange={(e) => setForm({ ...form, totalUnits: e.target.value })}
              />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='leave-reason'>{'Lý do'}</Label>
            <Textarea
              id='leave-reason'
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder='Nhập lý do nghỉ phép...'
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            {commonUiCopy.cancel ?? 'Hủy'}
          </Button>
          <Button onClick={() => void handleCreate()} disabled={createLeave.isPending}>
            {createLeave.isPending ? 'Đang tạo...' : commonUiCopy.create ?? 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
