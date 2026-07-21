'use client';

import { useState, useCallback } from 'react';
import { parseAsInteger, useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Section } from '@/components/layout/section';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { usePayrollRunsQuery, useCreatePayrollRunMutation, useUpdatePayrollRunMutation, useGeneratePayrollRunMutation } from '../queries/payroll-run-queries';
import { PayrollRunsTable } from '../tables/payroll-runs-table';
import { PayrollRunDialog } from './payroll-run-dialog';
import { GenerateRunDialog } from './generate-run-dialog';
import { useRouter } from 'next/navigation';
import type { PayrollRun, CreatePayrollRunPayload } from '../types';
import { perPageParser, pageParser } from '@/lib/pagination';

export function PayrollRunsPageClient() {
  const router = useRouter();
  const [page] = useQueryState('page', pageParser);
  const [perPage] = useQueryState('perPage', perPageParser);
  const { data, isLoading, isError, error, refetch } = usePayrollRunsQuery({ page, limit: perPage });
  const createMutation = useCreatePayrollRunMutation();
  const updateMutation = useUpdatePayrollRunMutation();
  const generateMutation = useGeneratePayrollRunMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollRun | null>(null);
  const [generateId, setGenerateId] = useState<string | null>(null);

  const rows = data?.rows ?? [];
  const saving = createMutation.isPending || updateMutation.isPending;

  const handleEdit = useCallback((item: PayrollRun) => {
    setEditing(item);
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(
    async (values: CreatePayrollRunPayload) => {
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

  const handleGenerateConfirm = useCallback(async () => {
    if (!generateId) return;
    await generateMutation.mutateAsync(generateId);
    setGenerateId(null);
  }, [generateId, generateMutation]);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/payroll/runs/${id}`);
    },
    [router],
  );

  if (isError && !isLoading) {
    return (
      <Section>
        <QueryErrorAlert error={error} subject='bảng lương' onRetry={() => refetch()} />
      </Section>
    );
  }

  return (
    <Section>
      <div className='flex items-center justify-end'>
        <Button onClick={handleAdd} size='sm'>
            <Icons.add className='mr-1.5 h-4 w-4' />
            Tạo bảng lương
          </Button>
      </div>
      <PayrollRunsTable
        data={rows}
        total={data?.total ?? 0}
        onEdit={handleEdit}
        onGenerate={setGenerateId}
        onView={handleView}
        loading={isLoading}
      />
      <PayrollRunDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        editing={editing}
        saving={saving}
      />
      <GenerateRunDialog
        open={!!generateId}
        onOpenChange={(open) => { if (!open) setGenerateId(null); }}
        onConfirm={handleGenerateConfirm}
        generating={generateMutation.isPending}
      />
    </Section>
  );
}
