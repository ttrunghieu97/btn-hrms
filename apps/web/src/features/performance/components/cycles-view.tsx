'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { performanceCyclesQueryOptions } from '../api/queries';
import { useCreatePerformanceCycle, useTransitionCycle } from '../api/mutations';
import { extractList, extractPagination } from '@/lib/api-extract';
import { CYCLE_STATUS_MAP, type PerformanceCycleRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
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
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { toast } from 'sonner';
import { EmptyState } from '@/components/states/empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, performanceUiCopy } from '@/locales/vi/app-copy';
import { createPerformanceCycleSchema, type CreatePerformanceCycleFormValues } from '../schemas/performance.schema';
import { pageParser } from '@/lib/pagination';

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
  const [form, setForm] = useState<CreatePerformanceCycleFormValues>({
    name: '',
    startsOn: '',
    endsOn: '',
  });

  const filters = {
    page: params.page,
    limit: 20,
    ...(params.status ? { status: params.status } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    performanceCyclesQueryOptions(filters),
  );
  const rows = extractList<PerformanceCycleRow>(data);
  const pagination = extractPagination(data);

  const createCycle = useCreatePerformanceCycle();
  const transitionCycle = useTransitionCycle();

  async function handleCreate() {
    const parsed = createPerformanceCycleSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Vui lòng kiểm tra lại thông tin');
      return;
    }
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
      <PageHeader
        title={copy.title}
        description={performanceUiCopy.description}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>
                <Icons.add className='mr-1.5 size-4' />
                {copy.create}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{copy.create}</DialogTitle>
                <DialogDescription>{performanceUiCopy.description}</DialogDescription>
              </DialogHeader>
              <div className='grid gap-4 py-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='cycle-name'>{commonUiCopy.name}</Label>
                  <Input
                    id='cycle-name'
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='cycle-starts-on'>Ngày bắt đầu</Label>
                  <Input
                    id='cycle-starts-on'
                    type='date'
                    value={form.startsOn}
                    onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
                    required
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='cycle-ends-on'>Ngày kết thúc</Label>
                  <Input
                    id='cycle-ends-on'
                    type='date'
                    value={form.endsOn}
                    onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
                <Button onClick={() => void handleCreate()} disabled={createCycle.isPending}>
                  {createCycle.isPending && <Icons.spinner className='mr-1.5 size-4 animate-spin' />}
                  {commonUiCopy.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {rows.length === 0 && !isLoading ? (
        <EmptyState icon={<Icons.page className='size-10' />} title={copy.empty} compact />
      ) : (
        <div className='rounded-md border overflow-hidden'>
          {/* Mobile cards view */}
          <div className='flex flex-col gap-3 p-3 md:hidden'>
            {rows.map((row) => (
              <Card key={row.id} className='p-4 space-y-2.5'>
                <div className='flex items-start justify-between gap-2'>
                  <span className='font-medium text-foreground text-sm'>{row.name ?? '—'}</span>
                  <StatusBadge mapping={CYCLE_STATUS_MAP} status={row.status ?? 'draft'} />
                </div>
                <div className='grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.startsOn}: </span>
                    {row.startsOn ? formatDateVN(row.startsOn) : '—'}
                  </div>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.endsOn}: </span>
                    {row.endsOn ? formatDateVN(row.endsOn) : '—'}
                  </div>
                </div>
                {(CYCLE_ACTIONS[row.status ?? ''] ?? []).length > 0 && (
                  <div className='pt-1 flex gap-2 justify-end'>
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
                )}
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className='hidden md:block overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{commonUiCopy.name}</TableHead>
                  <TableHead>{copy.columns.status}</TableHead>
                  <TableHead>{copy.columns.startsOn}</TableHead>
                  <TableHead>{copy.columns.endsOn}</TableHead>
                  <TableHead>{commonUiCopy.date}</TableHead>
                  <TableHead className='text-right' />
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
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-1'>
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
        </div>
      )}

      {pagination && pagination.total > 20 ? (
        <DataTablePagination
          page={params.page}
          pageCount={Math.ceil(pagination.total / 20)}
          pageSize={20}
          total={pagination.total}
          onPageChange={(page) => void setParams({ page })}
        />
      ) : null}
    </div>
  );
}
