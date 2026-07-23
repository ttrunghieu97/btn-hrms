'use client';

import { useState, useCallback } from 'react';
import { parseAsInteger, useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Section } from '@/components/layout/section';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { usePayrollPeriodsQuery, useCreatePayrollPeriodMutation, useUpdatePayrollPeriodMutation } from '../queries/period-queries';
import { PayrollPeriodsTable } from '../tables/payroll-periods-table';
import { PayrollPeriodDialog } from './payroll-period-dialog';
import type { PayrollPeriod, CreatePayrollPeriodPayload } from '../types';
import { perPageParser, pageParser } from '@/lib/pagination';

export function PayrollPeriodsPageClient() {
  const [page] = useQueryState('page', pageParser);
  const [perPage] = useQueryState('perPage', perPageParser);
  const { data, isLoading, isError, error, refetch } = usePayrollPeriodsQuery({ page, limit: perPage });
  const createMutation = useCreatePayrollPeriodMutation();
  const updateMutation = useUpdatePayrollPeriodMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollPeriod | null>(null);

  const rows = data?.rows ?? [];
  const saving = createMutation.isPending || updateMutation.isPending;

  const handleEdit = useCallback((item: PayrollPeriod) => {
    setEditing(item);
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(
    async (values: CreatePayrollPeriodPayload) => {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setDialogOpen(false);
      setEditing(null);
    },
    [editing, createMutation, updateMutation],
  );

  if (isError && !isLoading) {
    return (
      <Section>
        <QueryErrorAlert error={error} subject='kỳ lương' onRetry={() => refetch()} />
      </Section>
    );
  }

  return (
    <Section>
      <div className='flex items-center justify-end'>
        <Button onClick={handleAdd} size='sm'>
            <Icons.add className='mr-1.5 h-4 w-4' />
            Thêm kỳ lương
          </Button>
      </div>
      <PayrollPeriodsTable
        data={rows}
        total={data?.total ?? 0}
        onEdit={handleEdit}
        loading={isLoading}
      />
      <PayrollPeriodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        editing={editing}
        saving={saving}
      />
    </Section>
  );
}
