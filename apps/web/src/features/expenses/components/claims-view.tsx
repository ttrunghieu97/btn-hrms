'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { expenseClaimsQueryOptions } from '../api/queries';
import { formatDateVN } from '@/lib/date';
import {
  useCreateExpenseClaim,
  useSubmitExpenseClaim,
  useApproveExpenseClaim,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { PageHeader } from '@/components/layout/page-header';
import { commonUiCopy, expensesUiCopy } from '@/locales/vi/app-copy';
import { createExpenseClaimSchema, type CreateExpenseClaimFormValues } from '../schemas/expense.schema';
import { pageParser } from '@/lib/pagination';
import { ExpenseClaimDetailDialog } from './expense-claim-detail-dialog';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission } from '@project/permissions';
import { permissions } from '@/lib/permissions';

const copy = expensesUiCopy.claims;

export function ExpenseClaimsView() {
  const user = useAuthStore((s) => s.user);
  const userPermissions = user?.permissions ?? [];
  const canManageExpenses = Boolean(
    user?.isSuperAdmin ||
      userPermissions.includes('ALL') ||
      userPermissions.includes('sys:all') ||
      hasAnyPermission(userPermissions, [permissions.expenses.manage]),
  );

  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaimRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateExpenseClaimFormValues>({ title: '', currency: 'VND' });

  const filters: ExpenseClaimListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status ? { status: params.status as ExpenseClaimListFilters['status'] } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(expenseClaimsQueryOptions(filters));
  const allRows = extractList<ExpenseClaimRow>(data);
  const rows = useMemo(
    () =>
      params.status
        ? allRows.filter((r) => r.status === params.status)
        : allRows,
    [allRows, params.status],
  );
  const pagination = extractPagination(data);

  const createClaim = useCreateExpenseClaim();
  const submitClaim = useSubmitExpenseClaim();
  const approveClaim = useApproveExpenseClaim();
  const reimburseClaim = useReimburseExpenseClaim();

  async function handleCreate() {
    const parsed = createExpenseClaimSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Vui lòng kiểm tra lại thông tin');
      return;
    }
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
      <PageHeader
        title={copy.title}
        description={expensesUiCopy.description}
        actions={
          <div className='flex items-center gap-2'>
            <Select
              value={params.status ?? 'all'}
              onValueChange={(val) =>
                void setParams({ status: val === 'all' ? null : val, page: 1 })
              }
            >
              <SelectTrigger className='h-9 w-[170px]'>
                <SelectValue placeholder='Tất cả trạng thái' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả trạng thái</SelectItem>
                <SelectItem value='draft'>{expensesUiCopy.claimStatus.draft}</SelectItem>
                <SelectItem value='submitted'>{expensesUiCopy.claimStatus.submitted}</SelectItem>
                <SelectItem value='approved'>{expensesUiCopy.claimStatus.approved}</SelectItem>
                <SelectItem value='rejected'>{expensesUiCopy.claimStatus.rejected}</SelectItem>
                <SelectItem value='reimbursed'>{expensesUiCopy.claimStatus.reimbursed}</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size='sm'>
                  <Icons.add className='mr-2 size-4' />
                  {copy.create}
                </Button>
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
                  <Button variant='outline' onClick={() => setOpen(false)}>
                    {commonUiCopy.cancel}
                  </Button>
                  <Button onClick={() => void handleCreate()} disabled={createClaim.isPending}>
                    {commonUiCopy.create}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

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
              {rows.map((row) => {
                const amt = parseFloat(row.totalAmount || '0') || 0;
                const isSelfClaim = Boolean(
                  user?.employeeId && row.employeeId && String(user.employeeId) === String(row.employeeId),
                );
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <button
                        type='button'
                        className='text-left font-medium text-foreground hover:text-primary hover:underline'
                        onClick={() => setSelectedClaim(row)}
                      >
                        {row.title ?? '—'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <StatusBadge mapping={CLAIM_STATUS_MAP} status={row.status ?? 'draft'} />
                    </TableCell>
                    <TableCell className='font-mono font-medium'>
                      {amt > 0 ? amt.toLocaleString('vi-VN') : '—'}
                    </TableCell>
                    <TableCell>{row.currency ?? 'VND'}</TableCell>
                    <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1.5'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
                          onClick={() => setSelectedClaim(row)}
                        >
                          <Icons.eye className='mr-1 size-3.5' />
                          Chi tiết luồng
                        </Button>
                        {row.status === 'draft' ? (
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-7 text-xs'
                            onClick={() => submitClaim.mutate({ id: row.id })}
                            disabled={submitClaim.isPending}
                          >
                            {expensesUiCopy.actions.submit}
                          </Button>
                        ) : null}
                        {row.status === 'submitted' && canManageExpenses && !isSelfClaim ? (
                          <>
                            <Button
                              variant='default'
                              size='sm'
                              className='h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2'
                              onClick={() => approveClaim.mutate({ id: row.id })}
                              disabled={approveClaim.isPending}
                            >
                              <Icons.check className='mr-1 size-3' />
                              {expensesUiCopy.actions.approve}
                            </Button>
                            <Button
                              variant='destructive'
                              size='sm'
                              className='h-7 text-xs px-2'
                              onClick={() => setSelectedClaim(row)}
                            >
                              <Icons.close className='size-3' />
                            </Button>
                          </>
                        ) : null}
                        {row.status === 'approved' && canManageExpenses ? (
                          <Button
                            variant='default'
                            size='sm'
                            className='h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs'
                            onClick={() => reimburseClaim.mutate({ id: row.id })}
                            disabled={reimburseClaim.isPending}
                          >
                            {expensesUiCopy.actions.reimburse}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > filters.limit! ? (
        <DataTablePagination
          page={params.page}
          pageCount={Math.ceil(pagination.total / (filters.limit || 20))}
          pageSize={filters.limit || 20}
          total={pagination.total}
          onPageChange={(page) => void setParams({ page })}
        />
      ) : null}

      <ExpenseClaimDetailDialog
        claim={selectedClaim}
        open={Boolean(selectedClaim)}
        onOpenChange={(open) => {
          if (!open) setSelectedClaim(null);
        }}
      />
    </div>
  );
}
