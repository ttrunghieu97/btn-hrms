'use client';

import { useQuery } from '@tanstack/react-query';
import { employeesQueryOptions } from '@/features/employees';
import { extractList } from '@/lib/api-extract';
import { LeaveRequestsTable } from './leave-requests-table';
import { LeaveBalanceView } from './leave-balance-view';
import { LeaveApprovalInboxSection } from './leave-approval-inbox-section';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateLeaveRequestDialog } from './create-leave-request-dialog';
import { useAuthStore } from '@/stores/auth-store';

export function LeaveRequestsPageClient() {
  const user = useAuthStore((s) => s.user);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const { data: employeesData } = useQuery(employeesQueryOptions({ page: 1, limit: 100 }));
  const employees =
    employeesData?.employees ??
    extractList<{
      id: string;
      fullName?: string;
      employeeCode?: string;
      firstName?: string;
      lastName?: string;
    }>(employeesData);

  const effectiveEmployeeId =
    selectedEmployeeId || user?.employeeId || employees[0]?.id || '';

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-5'>
      {/* Pending Approvals Inbox for Managers/Approvers */}
      <LeaveApprovalInboxSection />

      {/* Top Filter and Actions */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <Select value={effectiveEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className='w-[260px] text-xs'>
              <SelectValue placeholder='Chọn nhân viên xem số dư ngày phép' />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => {
                const label =
                  [e.lastName, e.firstName].filter(Boolean).join(' ') || e.id.slice(0, 8);
                return (
                  <SelectItem key={e.id} value={e.id} className='text-xs'>
                    {e.employeeCode ? `${label} (${e.employeeCode})` : label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <CreateLeaveRequestDialog employeeId={effectiveEmployeeId} />
      </div>

      {/* Balance Summary */}
      <LeaveBalanceView employeeId={effectiveEmployeeId} />

      {/* Requests Table with Workflow Detail Actions */}
      <LeaveRequestsTable hideHeader />
    </div>
  );
}
