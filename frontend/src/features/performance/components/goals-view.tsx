'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { performanceGoalsQueryOptions, performanceCyclesQueryOptions } from '../api/queries';
import { useCreatePerformanceGoal, useTransitionGoal } from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { GOAL_STATUS_MAP, type PerformanceGoalRow, type PerformanceCycleRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, performanceUiCopy } from '@/locales/vi/app-copy';

const copy = performanceUiCopy;

const GOAL_ACTIONS: Record<string, { action: string; label: string }[]> = {
  draft: [{ action: 'submit', label: 'Trình duyệt' }],
  submitted: [{ action: 'approve', label: 'Phê duyệt' }],
  approved: [],
};

export function PerformanceGoalsView() {
  const [params, setParams] = useQueryStates({ cycleId: parseAsString });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const { data: cyclesData } = useQuery(performanceCyclesQueryOptions());
  const cycles = extractList<PerformanceCycleRow>(cyclesData);
  const selectedCycle = params.cycleId || cycles[0]?.id || '';

  const { data: goalsData, error, isLoading, refetch } = useQuery(
    performanceGoalsQueryOptions(selectedCycle)
  );
  const goals = extractList<PerformanceGoalRow>(goalsData);

  const createGoal = useCreatePerformanceGoal();
  const transitionGoal = useTransitionGoal();

  async function handleCreate() {
    if (!form.title || !selectedCycle) return;
    await createGoal.mutateAsync({ cycleId: selectedCycle, dto: { title: form.title, description: form.description || undefined } });
    setOpen(false);
    setForm({ title: '', description: '' });
  }

  if (error && !isLoading) {
    return (
      <QueryErrorAlert error={error} subject='Mục tiêu' onRetry={() => void refetch()} className='rounded-lg border-destructive/50 bg-destructive/5' />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>Mục tiêu</h2>
        <div className='flex items-center gap-2'>
          <Select value={selectedCycle} onValueChange={(v) => setParams({ cycleId: v })}>
            <SelectTrigger className='w-[250px]'>
              <SelectValue placeholder='Chọn chu kỳ' />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>Tạo mục tiêu</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo mục tiêu</DialogTitle>
                <DialogDescription>{copy.description}</DialogDescription>
              </DialogHeader>
              <div className='grid gap-4 py-4'>
                <div className='grid gap-2'>
                  <Label>{commonUiCopy.name}</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder='Nhập tên mục tiêu...' />
                </div>
                <div className='grid gap-2'>
                  <Label>Mô tả</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder='Mô tả mục tiêu...' rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
                <Button onClick={() => void handleCreate()} disabled={createGoal.isPending}>{commonUiCopy.create}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!selectedCycle ? (
        <AppEmptyState icon={<Icons.trophy className='size-10' />} title='Vui lòng chọn chu kỳ đánh giá' compact />
      ) : goals.length === 0 && !isLoading ? (
        <AppEmptyState icon={<Icons.trophy className='size-10' />} title='Chưa có mục tiêu nào' compact />
      ) : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{commonUiCopy.name}</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading ? [] : goals).map((row: PerformanceGoalRow) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.title ?? '—'}</TableCell>
                  <TableCell className='text-muted-foreground max-w-xs truncate'>{'—'}</TableCell>
                  <TableCell>
                    <StatusBadge mapping={GOAL_STATUS_MAP} status={row.status ?? 'draft'} />
                  </TableCell>
                  <TableCell>
                    <div className='flex gap-1'>
                      {(GOAL_ACTIONS[row.status ?? ''] ?? []).map((act) => (
                        <Button
                          key={act.action}
                          variant='outline'
                          size='sm'
                          onClick={() => transitionGoal.mutate({ goalId: row.id, action: act.action })}
                          disabled={transitionGoal.isPending}
                        >
                          {act.label}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
