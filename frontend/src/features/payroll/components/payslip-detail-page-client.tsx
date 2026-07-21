'use client';

import { formatDateTimeVN } from "@/lib/date";
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { MoneyCell } from '@/components/common/money-cell';
import { usePayslipQuery } from '../queries/payslip-queries';
import { PayslipStatusBadge } from './payslip-status-badge';

const fmtDate = (d: string | null | undefined) =>
  d ? formatDateTimeVN(d) : '\u2014';

interface Props {
  payslipId: string;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-lg border p-6'>
      <h2 className='mb-4 text-lg font-semibold'>{title}</h2>
      {children}
    </div>
  );
}

function DetailRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className ?? 'grid grid-cols-2 gap-4 py-2'}>
      <dt className='text-muted-foreground text-sm'>{label}</dt>
      <dd className='font-medium'>{value}</dd>
    </div>
  );
}

export function PayslipDetailPageClient({ payslipId }: Props) {
  const { data: payslip, isLoading, isError, error, refetch } = usePayslipQuery(payslipId);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-12'>
        <Icons.spinner className='h-6 w-6 animate-spin' />
      </div>
    );
  }

  if (isError || !payslip) {
    return (
      <div className='text-destructive flex flex-col items-center gap-2 p-8 text-center'>
        <Icons.alertCircle className='h-8 w-8' />
        <p>Không thể tải thông tin phiếu lương.</p>
        <p className='text-muted-foreground text-sm'>{(error as Error)?.message ?? 'Vui lòng thử lại sau.'}</p>
        <div className='mt-4 flex gap-2'>
          <Button variant='outline' onClick={() => refetch()}>Thử lại</Button>
          <Button variant='outline' asChild>
            <Link href='/payroll/payslips'>
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
          <Link href='/payroll/payslips'>
            <Icons.chevronLeft className='mr-1 h-4 w-4' />
            Quay lại
          </Link>
        </Button>
        <div className='flex items-center gap-3'>
          <h1 className='text-2xl font-bold tracking-tight'>
            Phiếu lương — {payslip.employee?.fullName ?? ''}
          </h1>
          <PayslipStatusBadge status={payslip.status} />
        </div>
        {payslip.employee?.employeeCode && (
          <p className='text-muted-foreground mt-1 text-sm'>
            Mã NV: {payslip.employee.employeeCode}
            {payslip.employee.departmentName && ` — ${payslip.employee.departmentName}`}
          </p>
        )}
      </div>

      <div className='rounded-lg border p-6'>
        <h2 className='mb-4 text-lg font-semibold'>Thông tin chung</h2>
        <dl className='grid grid-cols-2 gap-4 md:grid-cols-4'>
          <div>
            <dt className='text-muted-foreground text-sm'>Nhân viên</dt>
            <dd className='font-medium'>{payslip.employee?.fullName ?? '\u2014'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Mã NV</dt>
            <dd className='font-medium'>{payslip.employee?.employeeCode ?? '\u2014'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Phòng ban</dt>
            <dd className='font-medium'>{payslip.employee?.departmentName ?? '\u2014'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Trạng thái</dt>
            <dd><PayslipStatusBadge status={payslip.status} /></dd>
          </div>
        </dl>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <SectionCard title='Thu nhập'>
          <dl className='space-y-1'>
            <DetailRow
              label='Tổng thu nhập'
              value={<MoneyCell amount={payslip.grossPay} currency={payslip.currency} />}
            />
          </dl>
        </SectionCard>

        <SectionCard title='Khấu trừ'>
          <dl className='space-y-1'>
            <DetailRow
              label='Tổng khấu trừ'
              value={<MoneyCell amount={payslip.totalDeductions} currency={payslip.currency} />}
            />
          </dl>
        </SectionCard>
      </div>

      <div className='rounded-lg border bg-muted/10 p-6'>
        <h2 className='mb-4 text-lg font-semibold'>Tổng kết</h2>
        <dl className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <div>
            <dt className='text-muted-foreground text-sm'>Tổng thu nhập</dt>
            <dd className='text-lg font-medium'>
              <MoneyCell amount={payslip.grossPay} currency={payslip.currency} />
            </dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Khấu trừ</dt>
            <dd className='text-lg font-medium'>
              <MoneyCell amount={payslip.totalDeductions} currency={payslip.currency} />
            </dd>
          </div>
          <div>
            <dt className='text-muted-foreground text-sm'>Thực nhận</dt>
            <dd className='text-lg font-bold'>
              <MoneyCell amount={payslip.netPay} currency={payslip.currency} />
            </dd>
          </div>
        </dl>
        {payslip.publishedAt && (
          <p className='text-muted-foreground mt-4 text-xs'>
            Công bố lúc: {fmtDate(payslip.publishedAt)}
          </p>
        )}
      </div>

      {payslip.payrollRun && (
        <div className='rounded-lg border p-6'>
          <h2 className='mb-4 text-lg font-semibold'>Bảng lương</h2>
          <p className='text-muted-foreground text-sm'>
            <Link
              href={`/payroll/runs/${payslip.payrollRun.id}`}
              className='text-primary hover:underline'
            >
              Xem chi tiết bảng lương →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
