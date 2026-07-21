'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { benefitPlansQueryOptions } from '../api/queries';
import { useCreateBenefitPlan, usePublishBenefitPlan } from '../api/mutations';
import type { BenefitPlanListFilters } from '../queries/benefit-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import { BENEFIT_PLAN_STATUS_MAP, type BenefitPlanRow } from './status-maps';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
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
import { commonUiCopy, benefitsUiCopy } from '@/locales/vi/app-copy';
import { createBenefitPlanSchema, type CreateBenefitPlanFormValues } from '../schemas/benefit.schema';
import { pageParser, perPageParser, limitParser } from '@/lib/pagination';

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
    if (!parsed.success) return;
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
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{copy.title}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size='sm'>{copy.create}</Button>
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
                <Label>{copy.columns.name}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder='Tên gói phúc lợi'
                />
              </div>
              <div className='grid gap-2'>
                <Label>{copy.columns.coverageType}</Label>
                <select
                  className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'
                  value={form.coverageType}
                  onChange={(e) =>
                    setForm({ ...form, coverageType: e.target.value as any })
                  }
                >
                  <option value='employee_only'>Chỉ nhân viên</option>
                  <option value='employee_plus_one'>Nhân viên + 1</option>
                  <option value='family'>Gia đình</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setOpen(false)}>
                {commonUiCopy.cancel}
              </Button>
              <Button onClick={() => void handleCreate()} disabled={createPlan.isPending}>
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
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.columns.name}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{copy.columns.coverageType}</TableHead>
                <TableHead>{copy.columns.employerContribution}</TableHead>
                <TableHead>{copy.columns.employeeContribution}</TableHead>
                <TableHead>{copy.columns.createdAt}</TableHead>
                <TableHead />
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
                  <TableCell>
                    {row.status === 'draft' ? (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          publishPlan.mutate({ id: row.id })
                        }
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
