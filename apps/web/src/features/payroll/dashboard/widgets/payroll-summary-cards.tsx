import { Icons } from '@/components/icons';
import { MoneyCell } from '@/components/common/money-cell';
import type { PayrollSummary } from '../types';

interface Props {
  summary: PayrollSummary;
}

function SummaryCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className='rounded-lg border p-5'>
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-muted-foreground text-sm font-medium'>{title}</p>
          <div className='mt-2 text-2xl font-bold tracking-tight'>
            {loading ? (
              <Icons.spinner className='h-5 w-5 animate-spin' />
            ) : (
              value
            )}
          </div>
        </div>
        <div className='text-muted-foreground'>{icon}</div>
      </div>
    </div>
  );
}

export function PayrollSummaryCards({ summary }: Props) {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <SummaryCard
        title='Tổng chi phí lương'
        value={<MoneyCell amount={summary.totalGross} />}
        icon={<Icons.database className='h-5 w-5' />}
      />
      <SummaryCard
        title='Thực nhận'
        value={<MoneyCell amount={summary.totalNet} />}
        icon={<Icons.circleCheck className='h-5 w-5' />}
      />
      <SummaryCard
        title='Phiếu lương nháp'
        value={summary.draftPayslipCount}
        icon={<Icons.alertCircle className='h-5 w-5' />}
      />
      <SummaryCard
        title='Đã công bố'
        value={summary.publishedPayslipCount}
        icon={<Icons.circleCheck className='h-5 w-5' />}
      />
    </div>
  );
}
