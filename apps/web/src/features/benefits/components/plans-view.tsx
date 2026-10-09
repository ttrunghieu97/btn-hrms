'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { benefitPlansQueryOptions } from '../api/queries';
import { useCreateBenefitPlan, usePublishBenefitPlan } from '../api/mutations';
import type { BenefitPlanListFilters } from '../queries/benefit-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import { BENEFIT_PLAN_STATUS_MAP, type BenefitPlanRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, benefitsUiCopy } from '@/locales/vi/app-copy';
import { createBenefitPlanSchema, type CreateBenefitPlanFormValues } from '../schemas/benefit.schema';
import { pageParser } from '@/lib/pagination';

const copy = benefitsUiCopy.plans;

export function BenefitPlansView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    search: parseAsString,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateBenefitPlanFormValues>({
    name: '',
    coverageType: 'employee_only',
  });

  const filters: BenefitPlanListFilters = {
    page: params.page,
    limit: 20,
    ...(params.search ? { search: params.search } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    benefitPlansQueryOptions(filters),
  );
  const rows = extractList<BenefitPlanRow>(data);
  const pagination = extractPagination(data);

  const createPlan = useCreateBenefitPlan();
  const publishPlan = usePublishBenefitPlan();

  async function handleCreate() {
    const parsed = createBenefitPlanSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Vui lòng kiểm tra lại thông tin');
      return;
    }
    await createPlan.mutateAsync(parsed.data);
    setOpen(false);
    setForm({ name: '', coverageType: 'employee_only' });
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
      <div className='flex items-center justify-end gap-4'>
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
              <DialogDescription>
                {benefitsUiCopy.description}
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='benefit-plan-name'>{copy.columns.name}</Label>
                <Input
                  id='benefit-plan-name'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder='Tên gói phúc lợi'
                  required
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='benefit-plan-coverage'>{copy.columns.coverageType}</Label>
                <Select
                  value={form.coverageType}
                  onValueChange={(val) =>
                    setForm({ ...form, coverageType: val as CreateBenefitPlanFormValues['coverageType'] })
                  }
                >
                  <SelectTrigger id='benefit-plan-coverage'>
                    <SelectValue placeholder='Chọn loại bảo hiểm' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='employee_only'>Chỉ nhân viên</SelectItem>
                    <SelectItem value='employee_plus_one'>Nhân viên + 1</SelectItem>
                    <SelectItem value='family'>Gia đình</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setOpen(false)}>
                {commonUiCopy.cancel}
              </Button>
              <Button onClick={() => void handleCreate()} disabled={createPlan.isPending}>
                {createPlan.isPending && <Icons.spinner className='mr-1.5 size-4 animate-spin' />}
                {commonUiCopy.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 && !isLoading ? (
        <AppEmptyState
          icon={<Icons.page className='size-10' />}
          title={copy.empty}
          compact
        />
      ) : (
        <div className='rounded-md border overflow-hidden'>
          {/* Mobile cards view */}
          <div className='flex flex-col gap-3 p-3 md:hidden'>
            {rows.map((row) => (
              <Card key={row.id} className='p-4 space-y-2.5'>
                <div className='flex items-start justify-between gap-2'>
                  <span className='font-medium text-foreground text-sm'>{row.name ?? '—'}</span>
                  <StatusBadge mapping={BENEFIT_PLAN_STATUS_MAP} status={row.status ?? 'draft'} />
                </div>
                <div className='grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.coverageType}: </span>
                    {row.coverageType ?? '—'}
                  </div>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.createdAt}: </span>
                    {row.createdAt ? formatDateVN(row.createdAt) : '—'}
                  </div>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.employerContribution}: </span>
                    {row.employerContribution ?? '—'}
                  </div>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.employeeContribution}: </span>
                    {row.employeeContribution ?? '—'}
                  </div>
                </div>
                {row.status === 'draft' && (
                  <div className='pt-1 flex justify-end'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => publishPlan.mutate({ id: row.id })}
                      disabled={publishPlan.isPending}
                    >
                      Công bố
                    </Button>
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
                  <TableHead>{copy.columns.name}</TableHead>
                  <TableHead>{copy.columns.status}</TableHead>
                  <TableHead>{copy.columns.coverageType}</TableHead>
                  <TableHead>{copy.columns.employerContribution}</TableHead>
                  <TableHead>{copy.columns.employeeContribution}</TableHead>
                  <TableHead>{copy.columns.createdAt}</TableHead>
                  <TableHead className='text-right' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.name ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge mapping={BENEFIT_PLAN_STATUS_MAP} status={row.status ?? 'draft'} />
                    </TableCell>
                    <TableCell>{row.coverageType ?? '—'}</TableCell>
                    <TableCell>{row.employerContribution ?? '—'}</TableCell>
                    <TableCell>{row.employeeContribution ?? '—'}</TableCell>
                    <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                    <TableCell className='text-right'>
                      {row.status === 'draft' ? (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => publishPlan.mutate({ id: row.id })}
                          disabled={publishPlan.isPending}
                        >
                          Công bố
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
    </div>
  );
}
