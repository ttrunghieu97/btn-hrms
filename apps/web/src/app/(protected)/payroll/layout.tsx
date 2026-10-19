'use client';

import * as React from 'react';
import { DomainHeader } from '@/components/layout/domain-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { routeLabels } from '@/lib/app-copy';

const tabs = [
  { href: '/payroll', label: routeLabels.overview },
  { href: '/payroll/salary-structures', label: routeLabels.salaryStructures },
  { href: '/payroll/periods', label: routeLabels.payrollPeriods },
  { href: '/payroll/runs', label: routeLabels.payrollRuns },
  { href: '/payroll/payslips', label: routeLabels.payslips },
];

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  const [bannerExpanded, setBannerExpanded] = React.useState(false);

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='px-4 pt-3 md:px-6'>
        <Alert className='border-amber-500/40 bg-amber-500/10 py-2.5 text-amber-900 dark:text-amber-200'>
          <Icons.warning className='size-4 text-amber-600 dark:text-amber-400' />
          <div className='flex flex-1 flex-col gap-1'>
            <div className='flex items-center justify-between gap-2'>
              <AlertTitle className='mb-0 text-xs font-semibold'>
                Chế độ tính lương tạm tính (Provisional Calculation — PD-04)
              </AlertTitle>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-6 px-2 text-xs text-amber-900 hover:bg-amber-500/20 dark:text-amber-200'
                onClick={() => setBannerExpanded((prev) => !prev)}
              >
                {bannerExpanded ? 'Thu gọn' : 'Chi tiết'}
              </Button>
            </div>
            {bannerExpanded && (
              <AlertDescription className='text-xs text-amber-800/90 dark:text-amber-200/90'>
                Khoản khấu trừ hiện đang sử dụng công thức tạm tính 10% (<code>grossPay × 0.1</code>,{' '}
                <code>isProvisional: true</code>) phục vụ kiểm thử luồng tính lương và phê duyệt. Đây{' '}
                <strong>không phải</strong> công thức khấu trừ BHXH / BHYT / BHTN / Thuế TNCN theo quy
                định pháp luật và chưa dùng để chi trả lương thực tế.
              </AlertDescription>
            )}
          </div>
        </Alert>
      </div>
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
    </div>
  );
}
