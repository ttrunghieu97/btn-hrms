'use client';

import { useRouter } from 'next/navigation';
import { Section } from '@/components/layout/section';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Skeleton } from 'boneyard-js/react';
import { usePayrollDashboardQuery } from '../queries/payroll-dashboard-queries';
import { PayrollSummaryCards } from '../widgets/payroll-summary-cards';
import { PayrollCostTrend } from '../widgets/payroll-cost-trend';
import { RecentPayrollRuns } from '../widgets/recent-payroll-runs';
import { DraftPayslipsWidget } from '../widgets/draft-payslips-widget';

export function PayrollDashboardPageClient() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = usePayrollDashboardQuery();

  if (isError && !isLoading) {
    return (
      <Section>
        <QueryErrorAlert error={error} subject='dữ liệu tổng quan' onRetry={() => refetch()} />
      </Section>
    );
  }

  return (
    <Section>
      <Skeleton name='payroll-dashboard' loading={isLoading || !data}>
        {data && (
          <>
            <PayrollSummaryCards summary={data.summary} />
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
              <PayrollCostTrend trend={data.trend} />
              <RecentPayrollRuns runs={data.recentRuns} />
            </div>
            <DraftPayslipsWidget payslips={data.draftPayslips} onView={(id) => router.push(`/payroll/payslips/${id}`)} />
          </>
        )}
      </Skeleton>
    </Section>
  );
}
