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

export function LeaveRequestsPageClient() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const { data: employeesData } = useQuery(employeesQueryOptions({ page: 1, limit: 100 }));
  const employees = extractList<{ id: string; firstName?: string; lastName?: string }>(employeesData);

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-5'>
      {/* Pending Approvals Inbox for Managers/Approvers */}
      <LeaveApprovalInboxSection />

      {/* Top Filter and Actions */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className='w-[260px] text-xs'>
              <SelectValue placeholder='Chọn nhân viên xem số dư ngày phép' />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id} className='text-xs'>
                  {[e.firstName, e.lastName].filter(Boolean).join(' ') || e.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CreateLeaveRequestDialog employeeId={selectedEmployeeId} />
      </div>

      {/* Balance Summary */}
      <LeaveBalanceView employeeId={selectedEmployeeId} />

      {/* Requests Table with Workflow Detail Actions */}
      <LeaveRequestsTable hideHeader />
    </div>
  );
}
