'use client';

import { formatDateTimeVN } from "@/lib/date";
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { usePayrollRunQuery } from '../queries/payroll-run-queries';
import { PayrollRunStatusBadge } from './payroll-run-status-badge';

const fmtDate = (d: string | null | undefined) =>
  d ? formatDateTimeVN(d) : '\u2014';

interface Props {
  runId: string;
}

export function PayrollRunDetailPageClient({ runId }: Props) {
  const { data: run, isLoading, isError, error, refetch } = usePayrollRunQuery(runId);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-12'>
        <Icons.spinner className='h-6 w-6 animate-spin' />
      </div>
    );
  }

  if (isError || !run) {
    return (
      <div className='text-destructive flex flex-col items-center gap-2 p-8 text-center'>
        <Icons.alertCircle className='h-8 w-8' />
        <p>Không thể tải thông tin bảng lương.</p>
        <p className='text-muted-foreground text-sm'>{(error as Error)?.message ?? 'Vui lòng thử lại sau.'}</p>
        <div className='mt-4 flex gap-2'>
          <Button variant='outline' onClick={() => refetch()}>Thử lại</Button>
          <Button variant='outline' asChild>
            <Link href='/payroll/runs'>
              <Icons.chevronLeft className='mr-2 h-4 w-4' />Quay lại
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <Button variant='ghost' asChild className='mb-2 -ml-2'>
          <Link href='/payroll/runs'>
            <Icons.chevronLeft className='mr-1 h-4 w-4' />
            Quay lại
          </Link>
        </Button>
        <div className='flex items-center gap-3'>
          <h1 className='text-2xl font-bold tracking-tight'>
            Bảng lương {run.payrollPeriod?.code ?? ''}
          </h1>
          <PayrollRunStatusBadge status={run.status} />
        </div>
      </div>

      <div className='rounded-lg border p-6'>
        <h2 className='mb-4 text-lg font-semibold'>Thông tin chung</h2>
        <dl className='grid grid-cols-2 gap-4'>
          <div>
            <dt className='text-muted-foreground text-sm'>Kỳ lương</dt>
            <dd className='font-medium'>{run.payrollPeriod?.name ?? '\u2014'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Mã kỳ lương</dt>
            <dd className='font-medium'>{run.payrollPeriod?.code ?? '\u2014'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Trạng thái</dt>
            <dd><PayrollRunStatusBadge status={run.status} /></dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Ngày tạo</dt>
            <dd className='font-medium'>{fmtDate(run.createdAt)}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Cập nhật</dt>
            <dd className='font-medium'>{fmtDate(run.updatedAt)}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Ngày xử lý</dt>
            <dd className='font-medium'>{fmtDate(run.processedAt)}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Ghi chú</dt>
            <dd className='font-medium'>{run.notes ?? '\u2014'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
