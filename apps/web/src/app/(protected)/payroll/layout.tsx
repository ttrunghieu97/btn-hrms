'use client';

import * as React from 'react';
import { DomainHeader } from '@/components/layout/domain-header';
import { routeLabels } from '@/lib/app-copy';

const tabs = [
  { href: '/payroll', label: routeLabels.overview },
  { href: '/payroll/salary-structures', label: routeLabels.salaryStructures },
  { href: '/payroll/periods', label: routeLabels.payrollPeriods },
  { href: '/payroll/runs', label: routeLabels.payrollRuns },
  { href: '/payroll/payslips', label: routeLabels.payslips },
];

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
    </div>
  );
}
