'use client';

import { useState, useCallback } from 'react';
import { parseAsInteger, useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Section } from '@/components/layout/section';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { useSalaryStructuresQuery, useCreateSalaryStructureMutation } from '../queries/salary-structure-queries';
import { SalaryStructuresTable } from '../tables/salary-structures-table';
import { SalaryStructureDialog } from './salary-structure-dialog';
import type { CreateSalaryStructurePayload } from '../types';
import { perPageParser, pageParser } from '@/lib/pagination';

export function SalaryStructuresPageClient() {
  const [page] = useQueryState('page', pageParser);
  const [perPage] = useQueryState('perPage', perPageParser);
  const { data, isLoading, isError, error, refetch } = useSalaryStructuresQuery({ page, limit: perPage });
  const createMutation = useCreateSalaryStructureMutation();

  const [dialogOpen, setDialogOpen] = useState(false);

  const rows = data?.rows ?? [];

  const handleAdd = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(
    async (values: CreateSalaryStructurePayload) => {
      await createMutation.mutateAsync(values);
      setDialogOpen(false);
    },
    [createMutation],
  );

  if (isError && !isLoading) {
    return (
      <Section>
        <QueryErrorAlert error={error} subject='cấu trúc lương' onRetry={() => refetch()} />
      </Section>
    );
  }

  return (
    <Section>
      <div className='flex items-center justify-end'>
        <Button onClick={handleAdd} size='sm'>
            <Icons.add className='mr-1.5 h-4 w-4' />
            Thêm cấu trúc lương
          </Button>
      </div>
      <SalaryStructuresTable
        data={rows}
        total={data?.total ?? 0}
        loading={isLoading}
      />
      <SalaryStructureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        saving={createMutation.isPending}
      />
    </Section>
  );
}
