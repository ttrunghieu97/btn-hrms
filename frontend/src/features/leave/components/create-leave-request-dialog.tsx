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
  const [form, setForm] = useState({
    employeeId: employeeId ?? '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    startSession: 'full_day' as const,
    endSession: 'full_day' as const,
    totalUnits: '',
    reason: '',
  });

  const { data: typesData } = useQuery(leaveTypesQueryOptions());
  const createLeave = useCreateLeaveRequest();

  async function handleCreate() {
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !form.totalUnits) return;
    const dto: CreateLeaveRequestDto = {
      employeeId: form.employeeId,
      leaveTypeId: form.leaveTypeId,
      startDate: form.startDate,
      endDate: form.endDate,
      startSession: form.startSession,
      endSession: form.endSession,
      totalUnits: form.totalUnits,
      reason: form.reason || undefined,
    };
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
          <DialogDescription>{/* description */}</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label>{"Ngày bắt đầu"}</Label>
              <Input
                type='date'
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className='grid gap-2'>
              <Label>{"Ngày kết thúc"}</Label>
              <Input
                type='date'
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label>{'Loại nghỉ'}</Label>
              <Select
                value={form.leaveTypeId}
                onValueChange={(v) => setForm({ ...form, leaveTypeId: v })}
              >
                <SelectTrigger>
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
              <Label>{'Số ngày'}</Label>
              <Input
                type='text'
                placeholder='1.0'
                value={form.totalUnits}
                onChange={(e) => setForm({ ...form, totalUnits: e.target.value })}
              />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label>{'Lý do'}</Label>
            <Textarea
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
