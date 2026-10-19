'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MonthStats } from '../kpi-summary';
import type { PeriodStatus, TimesheetWorkspaceEmployee } from '../types';
import { employeeStatus, statusMap } from '../timesheet-calculations';

interface EmployeeAttendanceSummaryCardProps {
  employee: TimesheetWorkspaceEmployee;
  stats: MonthStats;
  verificationMap: Record<string, 'draft' | 'done'>;
  isSelectedVerified: boolean;
  isVerifying: boolean;
  canEdit: boolean;
  periodStatus?: PeriodStatus | string | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleVerifyEmployee: () => void;
  onPrintIndividual: () => void;
  onPrintAll: () => void;
}

export function EmployeeAttendanceSummaryCard({
  employee,
  stats,
  verificationMap,
  isSelectedVerified,
  isVerifying,
  canEdit,
  periodStatus,
  sidebarCollapsed,
  onToggleSidebar,
  onToggleVerifyEmployee,
  onPrintIndividual,
  onPrintAll,
}: EmployeeAttendanceSummaryCardProps) {
  return (
    <div className='bg-card border-border flex shrink-0 flex-col rounded-xl border p-4 shadow-xs'>
      {/* Top Row: Employee Identity & Individual Verification Actions */}
      <div className='flex flex-wrap items-center justify-between gap-2.5'>
        <div className='flex min-w-0 flex-wrap items-center gap-2.5'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onToggleSidebar}
            className='h-8 shrink-0 gap-1.5 px-2.5 text-xs print:hidden'
            title={sidebarCollapsed ? 'Mở rộng danh sách nhân sự' : 'Thu gọn danh sách nhân sự'}
          >
            <Icons.panelLeft className='size-3.5' />
            <span className='hidden sm:inline'>
              {sidebarCollapsed ? 'Hiện danh sách' : 'Thu gọn'}
            </span>
          </Button>

          <div className='bg-border hidden h-4 w-px sm:block print:hidden' />

          <div className='flex min-w-0 flex-wrap items-center gap-2 text-xs'>
            <span className='text-foreground truncate text-sm font-semibold'>
              {employee.fullName}
            </span>
            <Badge variant='outline' className='bg-background text-xs font-medium tabular-nums'>
              {employee.employeeCode}
            </Badge>
            <span className='text-muted-foreground hidden sm:inline'>·</span>
            <span className='text-muted-foreground font-medium'>
              {employee.departmentName || 'Chưa phân phòng ban'}
            </span>
            {employee.jobTitle && (
              <>
                <span className='text-muted-foreground hidden md:inline'>·</span>
                <span className='text-muted-foreground hidden md:inline'>{employee.jobTitle}</span>
              </>
            )}
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-2 print:hidden'>
          <StatusBadge
            status={employeeStatus(employee, verificationMap)}
            mapping={statusMap}
            className='px-2 py-0.5 text-xs'
          />

          <Button
            type='button'
            variant={isSelectedVerified ? 'outline' : 'default'}
            size='sm'
            onClick={onToggleVerifyEmployee}
            disabled={!canEdit || isVerifying || periodStatus === 'closed'}
            title={
              isSelectedVerified
                ? 'Mở chốt để chỉnh sửa bảng công nhân sự này'
                : 'Chốt công cá nhân cho nhân sự này'
            }
            className={cn(
              'h-8 gap-1.5 text-xs font-medium',
              isSelectedVerified &&
                'border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400',
            )}
          >
            {isVerifying ? (
              <Spinner className='size-3.5' />
            ) : isSelectedVerified ? (
              <Icons.restore className='size-3.5' />
            ) : (
              <Icons.check className='size-3.5' />
            )}
            <span>
              {isVerifying
                ? isSelectedVerified
                  ? 'Đang mở…'
                  : 'Đang chốt…'
                : isSelectedVerified
                  ? 'Mở chốt cá nhân'
                  : 'Chốt công cá nhân'}
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='outline'
                size='sm'
                title='Tùy chọn In / Xuất PDF'
                className='h-8 gap-1.5 text-xs'
              >
                <Icons.fileTypePdf className='text-muted-foreground size-3.5' />
                <span>In / PDF</span>
                <Icons.chevronDown className='size-3 opacity-60' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-40 text-xs'>
              <DropdownMenuItem onClick={onPrintIndividual} className='cursor-pointer gap-2 text-xs'>
                <Icons.user className='text-muted-foreground size-3.5' />
                <span>In bảng công cá nhân</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrintAll} className='cursor-pointer gap-2 text-xs'>
                <Icons.employee className='text-muted-foreground size-3.5' />
                <span>In toàn bộ kỳ công</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bottom Row: Open Whitespace KPI Summary Grid matching /attendance/summary */}
      <div className='border-border/60 mt-3.5 grid grid-cols-2 gap-4 border-t pt-3.5 sm:grid-cols-3 lg:grid-cols-6'>
        <div className='flex flex-col gap-0.5'>
          <span className='text-muted-foreground text-xs'>Công chính</span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-base font-semibold text-emerald-600 tabular-nums dark:text-emerald-400'>
              {stats.mainWork.toFixed(1)} công
            </span>
            <span className='text-muted-foreground text-xs tabular-nums'>
              ({stats.presentDays}/{stats.totalDays} ngày)
            </span>
          </div>
        </div>

        <div className='flex flex-col gap-0.5'>
          <span className='text-muted-foreground text-xs'>Tổng giờ làm</span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-foreground text-base font-semibold tabular-nums'>
              {stats.totHours.toFixed(1)}h
            </span>
            {stats.sundayWork > 0 && (
              <span className='text-muted-foreground text-xs tabular-nums'>
                · CN: {stats.sundayWork.toFixed(1)} công
              </span>
            )}
          </div>
        </div>

        <div className='flex flex-col gap-0.5'>
          <span className='text-muted-foreground text-xs'>Làm thêm giờ (OT)</span>
          <div className='flex items-baseline gap-1.5'>
            <span
              className={cn(
                'text-base font-semibold tabular-nums',
                stats.otHours > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-foreground',
              )}
            >
              {stats.otHours > 0 ? `${stats.otHours.toFixed(1)}h` : '0.0h'}
            </span>
          </div>
        </div>

        <div className='flex flex-col gap-0.5'>
          <span className='text-muted-foreground text-xs'>Thiếu công / Về sớm</span>
          <div className='flex items-baseline gap-1.5'>
            <span
              className={cn(
                'text-base font-semibold tabular-nums',
                stats.deficitHours > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-foreground',
              )}
            >
              {stats.deficitHours > 0 ? `${stats.deficitHours.toFixed(1)}h` : '0.0h'}
            </span>
          </div>
        </div>

        <div className='flex flex-col gap-0.5'>
          <span className='text-muted-foreground text-xs'>Ca trực phụ trội</span>
          <div className='text-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium tabular-nums'>
            <span title='Trực trưa'>Trưa: {stats.lunchDutyHours.toFixed(1)}h</span>
            <span className='text-muted-foreground'>·</span>
            <span title='Trực 35k'>35k: {stats.duty35kHours.toFixed(1)}h</span>
            <span className='text-muted-foreground'>·</span>
            <span title='Trực đêm / Đứng nước'>
              Đêm/Nước: {stats.night}/{stats.water}
            </span>
          </div>
        </div>

        <div className='flex flex-col gap-0.5'>
          <span className='text-muted-foreground text-xs'>Chuyên cần tháng</span>
          <div className='flex items-center gap-1.5 pt-0.5'>
            <Badge
              variant='outline'
              className={cn(
                'text-xs font-medium tabular-nums',
                stats.chuyenCan
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-border text-muted-foreground bg-muted/40',
              )}
            >
              {stats.chuyenCan ? 'Đạt chuẩn' : 'Chưa đủ'} ({stats.fullCongDays}/26 công)
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
