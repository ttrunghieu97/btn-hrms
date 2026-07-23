import { MoneyCell } from '@/components/common/money-cell';
import type { PayrollCostTrend } from '../types';

interface Props {
  trend: PayrollCostTrend[];
}

export function PayrollCostTrend({ trend }: Props) {
  if (trend.length === 0) {
    return (
      <div className='rounded-lg border p-5'>
        <h3 className='mb-2 text-sm font-semibold'>Xu hướng chi phí lương</h3>
        <p className='text-muted-foreground text-sm'>Chưa có dữ liệu.</p>
      </div>
    );
  }

  return (
    <div className='rounded-lg border p-5'>
      <h3 className='mb-4 text-sm font-semibold'>Xu hướng chi phí lương</h3>
      <div className='space-y-3'>
        {trend.map((t) => (
          <div key={t.periodId} className='space-y-1'>
            <div className='flex items-center justify-between text-sm'>
              <span className='font-medium'>{t.periodName}</span>
              <span className='text-muted-foreground'>{t.employeeCount} NV</span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Tổng chi phí</span>
              <MoneyCell amount={t.totalGross} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
