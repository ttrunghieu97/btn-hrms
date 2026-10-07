'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { routeLabels } from '@/lib/app-copy';

const tabs = [
  { href: '/payroll', label: routeLabels.overview },
  { href: '/payroll/salary-structures', label: routeLabels.salaryStructures },
  { href: '/payroll/periods', label: routeLabels.payrollPeriods },
  { href: '/payroll/runs', label: routeLabels.payrollRuns },
  { href: '/payroll/payslips', label: routeLabels.payslips },
];

export function PayrollNav() {
  const pathname = usePathname();

  const currentTab = tabs.find((tab) =>
    tab.href === '/payroll'
      ? pathname === '/payroll'
      : pathname.startsWith(tab.href)
  )?.href ?? '/payroll';

  return (
    <div className="flex border-b border-border overflow-x-auto scrollbar-none mb-4">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors hover:text-primary border-b-2 -mb-[2px] whitespace-nowrap',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
