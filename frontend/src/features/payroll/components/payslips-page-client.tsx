'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parseAsInteger, useQueryState } from 'nuqs';
import { Section } from '@/components/layout/section';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { usePayslipsQuery, usePublishPayslipMutation } from '../queries/payslip-queries';
import { PayslipsTable } from '../tables/payslips-table';
import { PublishPayslipDialog } from './publish-payslip-dialog';
import { perPageParser, pageParser } from '@/lib/pagination';

export function PayslipsPageClient() {
  const router = useRouter();
  const [page] = useQueryState('page', pageParser);
  const [perPage] = useQueryState('perPage', perPageParser);
  const { data, isLoading, isError, error, refetch } = usePayslipsQuery({ page, limit: perPage });
  const publishMutation = usePublishPayslipMutation();

  const [publishId, setPublishId] = useState<string | null>(null);

  const rows = data?.rows ?? [];

  const handleView = useCallback(
    (id: string) => {
      router.push(`/payroll/payslips/${id}`);
    },
    [router],
  );

  const handlePublishConfirm = useCallback(async () => {
    if (!publishId) return;
    await publishMutation.mutateAsync({ id: publishId });
    setPublishId(null);
  }, [publishId, publishMutation]);

  if (isError && !isLoading) {
    return (
      <Section>
        <QueryErrorAlert error={error} subject='phiếu lương' onRetry={() => refetch()} />
      </Section>
    );
  }

  return (
    <Section>
      <PayslipsTable
        data={rows}
        total={data?.total ?? 0}
        onView={handleView}
        onPublish={setPublishId}
        loading={isLoading}
      />
      <PublishPayslipDialog
        open={!!publishId}
        onOpenChange={(open) => { if (!open) setPublishId(null); }}
        onConfirm={handlePublishConfirm}
        publishing={publishMutation.isPending}
      />
    </Section>
  );
}
