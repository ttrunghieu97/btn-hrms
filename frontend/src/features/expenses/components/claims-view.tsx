'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { expenseClaimsQueryOptions } from '../api/queries';
import { formatDateVN } from "@/lib/date";
import {
  useCreateExpenseClaim,
  useSubmitExpenseClaim,
  useApproveExpenseClaim,
  useRejectExpenseClaim,
  useReimburseExpenseClaim,
} from '../api/mutations';
import type { ExpenseClaimListFilters } from '../queries/expense-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import { CLAIM_STATUS_MAP, type ExpenseClaimRow } from './status-maps';
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
import { commonUiCopy, expensesUiCopy } from '@/locales/vi/app-copy';
import { createExpenseClaimSchema, type CreateExpenseClaimFormValues } from '../schemas/expense.schema';
import { pageParser, perPageParser, limitParser } from '@/lib/pagination';

const copy = expensesUiCopy.claims;

export function ExpenseClaimsView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateExpenseClaimFormValues>({ title: '', currency: 'VND' });

  const filters: ExpenseClaimListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status ? { status: params.status as ExpenseClaimListFilters['status'] } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(expenseClaimsQueryOptions(filters));
  const rows = extractList<ExpenseClaimRow>(data);
  const pagination = extractPagination(data);

  const createClaim = useCreateExpenseClaim();
  const submitClaim = useSubmitExpenseClaim();
  const approveClaim = useApproveExpenseClaim();
  const rejectClaim = useRejectExpenseClaim();
  const reimburseClaim = useReimburseExpenseClaim();

  async function handleCreate() {
    const parsed = createExpenseClaimSchema.safeParse(form);
    if (!parsed.success) return;
    await createClaim.mutateAsync(parsed.data);
    setOpen(false);
    setForm({ title: '', currency: 'VND' });
  }

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size='sm'>{copy.create}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{copy.create}</DialogTitle>
              <DialogDescription>{expensesUiCopy.description}</DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label>{copy.columns.title}</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className='grid gap-2'>
                <Label>{commonUiCopy.description}</Label>
                <Textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
              <Button onClick={() => void handleCreate()} disabled={createClaim.isPending}>{commonUiCopy.create}</Button>
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
                <TableHead>{copy.columns.title}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{copy.columns.totalAmount}</TableHead>
                <TableHead>{copy.columns.currency}</TableHead>
                <TableHead>{commonUiCopy.date}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.title ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge mapping={CLAIM_STATUS_MAP} status={row.status ?? 'draft'} />
                  </TableCell>
                  <TableCell>{row.totalAmount ?? '—'}</TableCell>
                  <TableCell>{row.currency ?? 'VND'}</TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                  <TableCell>
                    <div className='flex gap-1'>
                      {row.status === 'draft' ? (
                        <Button variant='outline' size='sm' onClick={() => submitClaim.mutate({ id: row.id })} disabled={submitClaim.isPending}>
                          {expensesUiCopy.actions.submit}
                        </Button>
                      ) : null}
                      {row.status === 'submitted' ? (
                        <>
                          <Button variant='outline' size='sm' onClick={() => approveClaim.mutate({ id: row.id })} disabled={approveClaim.isPending}>
                            {expensesUiCopy.actions.approve}
                          </Button>
                          <Button variant='outline' size='sm' onClick={() => rejectClaim.mutate({ id: row.id })} disabled={rejectClaim.isPending}>
                            {expensesUiCopy.actions.reject}
                          </Button>
                        </>
                      ) : null}
                      {row.status === 'approved' ? (
                        <Button variant='outline' size='sm' onClick={() => reimburseClaim.mutate({ id: row.id })} disabled={reimburseClaim.isPending}>
                          {expensesUiCopy.actions.reimburse}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > filters.limit! ? (
        <div className='flex items-center justify-end gap-2'>
          <Button variant='outline' size='sm' disabled={params.page <= 1} onClick={() => void setParams({ page: params.page - 1 })}>‹</Button>
          <span className='text-sm text-muted-foreground'>{params.page}</span>
          <Button variant='outline' size='sm' disabled={params.page * filters.limit! >= pagination.total} onClick={() => void setParams({ page: params.page + 1 })}>›</Button>
        </div>
      ) : null}
    </div>
  );
}
