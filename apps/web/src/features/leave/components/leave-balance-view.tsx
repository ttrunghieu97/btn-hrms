'use client';

import { useQuery } from '@tanstack/react-query';
import { myLeaveBalancesQueryOptions } from '../api/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';

interface LeaveBalanceRow {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  balanceYear: number;
  openingBalance: string;
  accruedAmount: string;
  usedAmount: string;
  carriedOverAmount: string;
  adjustedAmount: string;
  leaveType: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
}

export function LeaveBalanceView({ employeeId }: { employeeId?: string }) {
  const { data, error, isLoading, refetch } = useQuery(myLeaveBalancesQueryOptions(employeeId));

  const balances = (data as unknown as { data?: LeaveBalanceRow[] })?.data ?? [];

  if (!employeeId) {
    return (
      <Card>
        <CardHeader><CardTitle className='text-base'>Số dư nghỉ phép</CardTitle></CardHeader>
        <CardContent>
          <AppEmptyState icon={<Icons.user2 className='size-8' />} title='Chưa chọn nhân viên' compact />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle className='text-base'>Số dư nghỉ phép</CardTitle></CardHeader>
        <CardContent>
          <QueryErrorAlert error={error} subject='số dư' onRetry={() => void refetch()} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Số dư nghỉ phép — {new Date().getFullYear()}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-2'>
            {[1, 2].map((i) => <Skeleton key={i} className='h-8 w-full' />)}
          </div>
        ) : balances.length === 0 ? (
          <AppEmptyState icon={<Icons.calendar className='size-8' />} title='Chưa có số dư cho năm nay' compact />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại phép</TableHead>
                <TableHead className='text-right'>Đầu năm</TableHead>
                <TableHead className='text-right'>Tích lũy</TableHead>
                <TableHead className='text-right'>Đã dùng</TableHead>
                <TableHead className='text-right'>Còn lại</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((b: LeaveBalanceRow) => {
                const opening = parseFloat(b.openingBalance ?? '0');
                const accrued = parseFloat(b.accruedAmount ?? '0');
                const used = parseFloat(b.usedAmount ?? '0');
                const remaining = opening + accrued - used;
                return (
                  <TableRow key={b.id}>
                    <TableCell className='font-medium'>{b.leaveType?.name ?? '—'}</TableCell>
                    <TableCell className='text-right'>{opening.toFixed(1)}</TableCell>
                    <TableCell className='text-right'>{accrued.toFixed(1)}</TableCell>
                    <TableCell className='text-right'>{used.toFixed(1)}</TableCell>
                    <TableCell className='text-right font-semibold'>{remaining.toFixed(1)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
