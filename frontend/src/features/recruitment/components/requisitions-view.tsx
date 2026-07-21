'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { requisitionsQueryOptions } from '../api/queries';
import {
  useCreateRequisition,
  useSubmitRequisition,
  useCloseRequisition,
} from '../api/mutations';
import type { RequisitionListFilters } from '../queries/recruitment-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import { REQUISITION_STATUS_MAP, type RequisitionRow } from './status-maps';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { commonUiCopy, recruitmentUiCopy } from '@/lib/app-copy';
import { pageParser, perPageParser, limitParser } from '@/lib/pagination';

const copy = recruitmentUiCopy.requisitions;

function formatBudget(min?: string | null, max?: string | null) {
  if (!min && !max) return '—';
  return `${min ?? '—'} – ${max ?? '—'}`;
}

export function RequisitionsView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });

  const filters: RequisitionListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status
      ? { status: params.status as RequisitionListFilters['status'] }
      : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    requisitionsQueryOptions(filters),
  );
  const rows = extractList<RequisitionRow>(data);
  const pagination = extractPagination(data);

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject={copy.title}
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{copy.title}</h2>
        <CreateRequisitionDialog />
      </div>

      {rows.length === 0 && !isLoading ? (
        <AppEmptyState
          icon={<Icons.page className='size-10' />}
          title={copy.empty}
          compact
        />
      ) : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.columns.title}</TableHead>
                <TableHead>{copy.columns.headcount}</TableHead>
                <TableHead>{copy.columns.budget}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead className='text-right'>
                  {commonUiCopy.actionsMenu}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.title ?? '—'}</TableCell>
                  <TableCell>{row.headcount ?? '—'}</TableCell>
                  <TableCell>{formatBudget(row.budgetMin, row.budgetMax)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={row.status ?? ''}
                      mapping={REQUISITION_STATUS_MAP}
                    />
                  </TableCell>
                  <TableCell className='text-right'>
                    <RequisitionRowActions row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > filters.limit! ? (
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={params.page <= 1}
            onClick={() => void setParams({ page: params.page - 1 })}
          >
            ‹
          </Button>
          <span className='text-sm text-muted-foreground'>{params.page}</span>
          <Button
            variant='outline'
            size='sm'
            disabled={params.page * filters.limit! >= pagination.total}
            onClick={() => void setParams({ page: params.page + 1 })}
          >
            ›
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function RequisitionRowActions({ row }: { row: RequisitionRow }) {
  const submit = useSubmitRequisition();
  const close = useCloseRequisition();

  const onSubmit = async () => {
    try {
      await submit.mutateAsync({ id: row.id });
      notifyMutationSuccess(recruitmentUiCopy.offers.actions.submit);
    } catch (err) {
      notifyMutationError(err, recruitmentUiCopy.offers.actions.submit);
    }
  };

  const onClose = async () => {
    try {
      await close.mutateAsync({ id: row.id });
      notifyMutationSuccess(recruitmentUiCopy.postings.actions.close);
    } catch (err) {
      notifyMutationError(err, recruitmentUiCopy.postings.actions.close);
    }
  };

  const isTerminal = row.status === 'closed' || row.status === 'rejected';

  return (
    <div className='flex justify-end gap-2'>
      {row.status === 'draft' ? (
        <Button
          variant='outline'
          size='sm'
          onClick={() => void onSubmit()}
          disabled={submit.isPending}
        >
          {recruitmentUiCopy.offers.actions.submit}
        </Button>
      ) : null}
      {!isTerminal ? (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => void onClose()}
          disabled={close.isPending}
        >
          {recruitmentUiCopy.postings.actions.close}
        </Button>
      ) : null}
    </div>
  );
}

function CreateRequisitionDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    departmentId: '',
    title: '',
    headcount: '1',
    budgetMin: '',
    budgetMax: '',
    justification: '',
  });
  const create = useCreateRequisition();

  const onCreate = async () => {
    try {
      await create.mutateAsync({
        departmentId: form.departmentId.trim(),
        title: form.title.trim(),
        headcount: Number(form.headcount) || 1,
        ...(form.budgetMin ? { budgetMin: form.budgetMin } : {}),
        ...(form.budgetMax ? { budgetMax: form.budgetMax } : {}),
        ...(form.justification ? { justification: form.justification } : {}),
      });
      notifyMutationSuccess(copy.create);
      setOpen(false);
      setForm({
        departmentId: '',
        title: '',
        headcount: '1',
        budgetMin: '',
        budgetMax: '',
        justification: '',
      });
    } catch (err) {
      notifyMutationError(err, copy.create);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <Icons.plusCircle className='mr-2 size-4' />
          {copy.create}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.create}</DialogTitle>
          <DialogDescription>{recruitmentUiCopy.description}</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-2'>
          <div className='grid gap-2'>
            <Label htmlFor='req-department'>{copy.columns.department}</Label>
            <Input
              id='req-department'
              value={form.departmentId}
              onChange={(e) =>
                setForm((f) => ({ ...f, departmentId: e.target.value }))
              }
              placeholder={copy.placeholders.departmentUuid}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='req-title'>{copy.columns.title}</Label>
            <Input
              id='req-title'
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className='grid grid-cols-3 gap-2'>
            <div className='grid gap-2'>
              <Label htmlFor='req-headcount'>{copy.columns.headcount}</Label>
              <Input
                id='req-headcount'
                type='number'
                min={1}
                value={form.headcount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headcount: e.target.value }))
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='req-budget-min'>{copy.fields.budgetMin}</Label>
              <Input
                id='req-budget-min'
                value={form.budgetMin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budgetMin: e.target.value }))
                }
                placeholder='0.00'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='req-budget-max'>{copy.fields.budgetMax}</Label>
              <Input
                id='req-budget-max'
                value={form.budgetMax}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budgetMax: e.target.value }))
                }
                placeholder='0.00'
              />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='req-justification'>{copy.fields.justification}</Label>
            <Textarea
              id='req-justification'
              value={form.justification}
              onChange={(e) =>
                setForm((f) => ({ ...f, justification: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            {commonUiCopy.cancel}
          </Button>
          <Button
            onClick={() => void onCreate()}
            disabled={create.isPending || !form.departmentId || !form.title}
          >
            {commonUiCopy.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
