'use client';

import { StatusCard } from '@/components/platform';
import type { TodaySummary } from '../types';
import { useWorkspaceRole } from '../queries';

interface TodayStatusProps {
  summary: TodaySummary;
}

export function TodayStatus({ summary }: TodayStatusProps) {
  const role = useWorkspaceRole();

  const attendanceVariant = (): 'success' | 'warning' | 'error' | 'neutral' => {
    if (!summary.attendance) return 'neutral';
    if (summary.attendance.status === 'checked_in') return 'success';
    if (summary.attendance.status === 'checked_out') return 'warning';
    return 'error';
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Attendance */}
      <StatusCard
        title="Attendance"
        value={
          summary.attendance?.status === 'checked_in'
            ? `Checked in ${summary.attendance.time ?? ''}`
            : summary.attendance?.status === 'checked_out'
              ? 'Checked out'
              : 'Not checked in'
        }
        variant={attendanceVariant()}
        subtitle={
          summary.attendance?.session
            ? `Session: ${summary.attendance.session}`
            : undefined
        }
      />

      {/* Leave Balance (employees) */}
      {role === 'employee' && summary.leaveBalance && (
        <>
          <StatusCard
            title="Annual Leave"
            value={`${summary.leaveBalance.annual.total - summary.leaveBalance.annual.used} days`}
            variant="info"
            subtitle={`${summary.leaveBalance.annual.used} used of ${summary.leaveBalance.annual.total}`}
          />
          <StatusCard
            title="Sick Leave"
            value={`${summary.leaveBalance.sick.total - summary.leaveBalance.sick.used} days`}
            variant="neutral"
            subtitle={`${summary.leaveBalance.sick.used} used of ${summary.leaveBalance.sick.total}`}
          />
        </>
      )}

      {/* Pending actions summary (managers) */}
      {(role === 'manager' || role === 'hr') && (
        <StatusCard
          title="Pending Actions"
          value={summary.pendingActionsCount}
          variant={summary.pendingActionsCount > 0 ? 'warning' : 'success'}
          subtitle={summary.pendingActionsCount > 0 ? 'Requires your attention' : 'All clear'}
        />
      )}
    </div>
  );
}
