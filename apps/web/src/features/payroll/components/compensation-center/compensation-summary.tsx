'use client';

import { MetricCard } from '@/components/platform';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CompensationData {
  currentSalary?: {
    amount: number;
    currency: string;
    period: string;
  };
  latestPayslip?: {
    id: string;
    period: string;
    netPay: number;
    currency?: string;
    status: string;
  };
  ytdEarnings?: number;
}

interface CompensationSummaryProps {
  data?: CompensationData;
  isLoading?: boolean;
}

export function CompensationSummary({ data, isLoading }: CompensationSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Current Base Salary"
          value={data?.currentSalary
            ? `${data.currentSalary.currency} ${data.currentSalary.amount.toLocaleString()}/${data.currentSalary.period}`
            : '—'}
          subtitle="As of current month"
        />
        <MetricCard
          title="Latest Payslip"
          value={data?.latestPayslip
            ? `${data.latestPayslip.currency} ${data.latestPayslip.netPay.toLocaleString()}`
            : '—'}
          subtitle={data?.latestPayslip?.period}
        />
        <MetricCard
          title="YTD Earnings"
          value={data?.ytdEarnings
            ? `${data.ytdEarnings.toLocaleString()}`
            : '—'}
          subtitle="Year to date"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="default" asChild>
          <Link href="/payroll/payslips">View All Payslips</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/payroll/salary-structures">Salary Structure</Link>
        </Button>
      </div>
    </div>
  );
}
