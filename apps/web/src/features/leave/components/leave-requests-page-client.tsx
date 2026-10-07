'use client';

import { useQuery } from '@tanstack/react-query';
import { employeesQueryOptions } from '@/features/employees';
import { extractList, extractPagination } from '@/lib/api-extract';
import { LeaveRequestsTable } from './leave-requests-table';
import { LeaveBalanceView } from './leave-balance-view';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LeaveRequestsPageClient() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const { data: employeesData } = useQuery(employeesQueryOptions({ page: 1, limit: 100 }));
  const employees = extractList<{ id: string; firstName?: string; lastName?: string }>(employeesData);

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
            Quản lý nghỉ phép
          </h1>
          <p className='text-sm text-muted-foreground'>
            Theo dõi, phê duyệt và quản lý số dư ngày nghỉ của nhân viên
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className='w-[250px]'>
              <SelectValue placeholder='Chọn nhân viên xem số dư' />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {[e.firstName, e.lastName].filter(Boolean).join(' ') || e.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <LeaveBalanceView employeeId={selectedEmployeeId} />
      <LeaveRequestsTable />
    </div>
  );
}
