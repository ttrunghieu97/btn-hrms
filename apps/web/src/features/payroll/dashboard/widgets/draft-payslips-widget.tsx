import { MoneyCell } from '@/components/common/money-cell';
import type { DraftPayslip } from '../types';

interface Props {
  payslips: DraftPayslip[];
  onView: (id: string) => void;
}

export function DraftPayslipsWidget({ payslips }: Props) {
  return (
    <div className='rounded-lg border p-5'>
      <h3 className='mb-4 text-sm font-semibold'>Phiếu lương nháp cần công bố</h3>
      {payslips.length === 0 ? (
        <p className='text-muted-foreground text-sm'>Không có phiếu lương nháp.</p>
      ) : (
        <div className='space-y-3'>
          {payslips.map((p) => (
            <div key={p.id} className='flex items-center justify-between'>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>
                  {p.employeeName} ({p.employeeCode})
                </p>
                <p className='text-muted-foreground text-xs'>{p.createdAt}</p>
              </div>
              <MoneyCell amount={p.netPay} className='text-sm' />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
