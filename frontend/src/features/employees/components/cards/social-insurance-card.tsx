'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listSocialInsurances, createSocialInsurance, deleteSocialInsurance, type SocialInsuranceRecord } from '../../api/social-insurance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { useMutation } from '@tanstack/react-query';

const SOCIAL_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ duyệt', variant: 'outline' },
  active: { label: 'Đang tham gia', variant: 'default' },
  paused: { label: 'Tạm dừng', variant: 'secondary' },
  terminated: { label: 'Kết thúc', variant: 'destructive' },
};

interface Props {
  employeeId: string;
}

export function SocialInsuranceCard({ employeeId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ insuranceNumber: '', startDate: '', endDate: '', reason: '' });
  const queryKey = ['social-insurance', employeeId];

  const { data, error, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => listSocialInsurances(employeeId),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { insuranceNumber: string; startDate: string }) =>
      createSocialInsurance(employeeId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      notifyMutationSuccess('Thêm BHXH thành công');
      setOpen(false);
      setForm({ insuranceNumber: '', startDate: '', endDate: '', reason: '' });
    },
    onError: (e) => notifyMutationError(e, 'Thêm BHXH thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: (enrollmentId: string) => deleteSocialInsurance(employeeId, enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      notifyMutationSuccess('Xoá BHXH thành công');
    },
    onError: (e) => notifyMutationError(e, 'Xoá BHXH thất bại'),
  });

  const records: SocialInsuranceRecord[] = data ?? [];

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base'>Bảo hiểm xã hội</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size='sm' variant='outline'>
              <Icons.add className='mr-1 size-3' /> Thêm
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Thêm BHXH</DialogTitle></DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label>Số BHXH</Label>
                <Input value={form.insuranceNumber} onChange={(e) => setForm({ ...form, insuranceNumber: e.target.value })} placeholder='Nhập số BHXH...' />
              </div>
              <div className='grid gap-2'>
                <Label>Ngày bắt đầu</Label>
                <Input type='date' value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className='grid gap-2'>
                <Label>Ngày kết thúc (không bắt buộc)</Label>
                <Input type='date' value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setOpen(false)}>Hủy</Button>
              <Button onClick={() => createMutation.mutate({ insuranceNumber: form.insuranceNumber, startDate: form.startDate })} disabled={createMutation.isPending || !form.insuranceNumber || !form.startDate}>
                {createMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-2'>{[1, 2].map((i) => <Skeleton key={i} className='h-10 w-full' />)}</div>
        ) : error ? (
          <QueryErrorAlert error={error} subject='BHXH' onRetry={() => void refetch()} />
        ) : records.length === 0 ? (
          <AppEmptyState icon={<Icons.shield className='size-8' />} title='Chưa có thông tin BHXH' compact />
        ) : (
          <div className='space-y-2'>
            {records.map((r) => (
              <div key={r.id} className='flex items-center justify-between rounded border p-3'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>{r.insuranceNumber}</p>
                  <p className='text-xs text-muted-foreground'>
                    {r.startDate}{r.endDate ? ` → ${r.endDate}` : ''}
                    {r.reason ? ` — ${r.reason}` : ''}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <StatusBadge status={r.status} mapping={SOCIAL_STATUS_MAP} />
                  <Button variant='ghost' size='icon' className='size-8' onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending}>
                    <Icons.trash className='size-4 text-destructive' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
