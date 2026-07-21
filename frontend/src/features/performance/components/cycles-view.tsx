'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { performanceCyclesQueryOptions } from '../api/queries';
import { useCreatePerformanceCycle, useTransitionCycle } from '../api/mutations';
import { extractList, extractPagination } from '@/lib/api-extract';
import { CYCLE_STATUS_MAP, type PerformanceCycleRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateVN } from "@/lib/date";
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
import { createPerformanceCycleSchema, type CreatePerformanceCycleFormValues } from '../schemas/performance.schema';
import { pageParser, perPageParser, limitParser } from '@/lib/pagination';

const copy = performanceUiCopy.cycles;

/** Next allowed transition buttons per cycle status */
const CYCLE_ACTIONS: Record<string, { action: string; label: string }[]> = {
  draft: [{ action: 'open-planning', label: 'Mở kế hoạch' }],
  planning: [{ action: 'start-self-review', label: 'Bắt đầu tự đánh giá' }],
  self_review: [{ action: 'start-manager-review', label: 'Bắt đầu đánh giá quản lý' }],
  manager_review: [{ action: 'start-calibration', label: 'Mở hiệu chỉnh' }],
  calibration: [{ action: 'submit-for-approval', label: 'Trình duyệt' }],
  ready_for_approval: [{ action: 'approve', label: 'Phê duyệt' }],
  approved: [{ action: 'publish', label: 'Công bố' }],
  published: [{ action: 'close', label: 'Đóng chu kỳ' }],
};

export function PerformanceCyclesView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreatePerformanceCycleFormValues>({ name: '', startsOn: '', endsOn: '' });

  const { data, error, isLoading, refetch } = useQuery(performanceCyclesQueryOptions({ status: params.status ?? undefined }));
  const rows = extractList<PerformanceCycleRow>(data);
  const pagination = extractPagination(data);

  const createCycle = useCreatePerformanceCycle();
  const transitionCycle = useTransitionCycle();

  async function handleCreate() {
    const parsed = createPerformanceCycleSchema.safeParse(form);
    if (!parsed.success) return;
    await createCycle.mutateAsync(parsed.data);
    setOpen(false);
    setForm({ name: '', startsOn: '', endsOn: '' });
  }

  if (error && !isLoading) {
    return (
      <QueryErrorAlert error={error} subject={copy.title} onRetry={() => void refetch()} className='rounded-lg border-destructive/50 bg-destructive/5' />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{copy.title}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size='sm'>{copy.create}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{copy.create}</DialogTitle>
              <DialogDescription>{performanceUiCopy.description}</DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label>{commonUiCopy.name}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className='grid gap-2'>
                <Label>Ngày bắt đầu</Label>
                <Input type='date' value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} />
              </div>
              <div className='grid gap-2'>
                <Label>Ngày kết thúc</Label>
                <Input type='date' value={form.endsOn} onChange={(e) => setForm({ ...form, endsOn: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
              <Button onClick={() => void handleCreate()} disabled={createCycle.isPending}>{commonUiCopy.create}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 && !isLoading ? (
        <AppEmptyState icon={<Icons.page className='size-10' />} title={copy.empty} compact />
      ) : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{commonUiCopy.name}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{copy.columns.startsOn}</TableHead>
                <TableHead>{copy.columns.endsOn}</TableHead>
                <TableHead>{commonUiCopy.date}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.name ?? '—'}</TableCell>
                  <TableCell><StatusBadge mapping={CYCLE_STATUS_MAP} status={row.status ?? 'draft'} /></TableCell>
                  <TableCell>{row.startsOn ? formatDateVN(row.startsOn) : '—'}</TableCell>
                  <TableCell>{row.endsOn ? formatDateVN(row.endsOn) : '—'}</TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                  <TableCell>
                    <div className='flex gap-1'>
                      {(CYCLE_ACTIONS[row.status ?? ''] ?? []).map((act) => (
                        <Button
                          key={act.action}
                          variant='outline'
                          size='sm'
                          onClick={() => transitionCycle.mutate({ id: row.id, action: act.action })}
                          disabled={transitionCycle.isPending}
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

      {pagination && pagination.total > 20 ? (
        <div className='flex items-center justify-end gap-2'>
          <Button variant='outline' size='sm' disabled={params.page <= 1} onClick={() => void setParams({ page: params.page - 1 })}>‹</Button>
          <span className='text-sm text-muted-foreground'>{params.page}</span>
          <Button variant='outline' size='sm' disabled={params.page * 20 >= pagination.total} onClick={() => void setParams({ page: params.page + 1 })}>›</Button>
        </div>
      ) : null}
    </div>
  );
}
