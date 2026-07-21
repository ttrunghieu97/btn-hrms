import { PayrollRunStatusBadge } from '../../components/payroll-run-status-badge';
import type { RecentRun } from '../types';

interface Props {
  runs: RecentRun[];
}

export function RecentPayrollRuns({ runs }: Props) {
  return (
    <div className='rounded-lg border p-5'>
      <h3 className='mb-4 text-sm font-semibold'>Bảng lương gần đây</h3>
      {runs.length === 0 ? (
        <p className='text-muted-foreground text-sm'>Chưa có bảng lương nào.</p>
      ) : (
        <div className='space-y-3'>
          {runs.map((run) => (
            <div key={run.id} className='flex items-center justify-between'>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{run.periodName}</p>
                <p className='text-muted-foreground text-xs'>{run.createdAt}</p>
              </div>
              <PayrollRunStatusBadge status={run.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
