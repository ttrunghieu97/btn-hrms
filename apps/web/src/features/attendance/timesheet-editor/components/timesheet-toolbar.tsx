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
import type { PeriodStatus, TimesheetWorkspaceEmployee } from '../types';
import {
  employeeStatus,
  statusMap,
} from '../timesheet-calculations';

interface TimesheetToolbarProps {
  employee: TimesheetWorkspaceEmployee;
  verificationMap: Record<string, 'draft' | 'done'>;
  isSelectedVerified: boolean;
  isVerifying: boolean;
  canEdit: boolean;
  periodStatus?: PeriodStatus | string | null;
  sidebarCollapsed: boolean;
  undoCount: number;
  redoCount: number;
  dirtyDayCount: number;
  dirtyCellCount: number;
  isSaving: boolean;
  onToggleSidebar: () => void;
  onToggleVerifyEmployee: () => void;
  onPrintIndividual: () => void;
  onPrintAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscardDirty: () => void;
  onSaveDirty: () => void;
}

export const TimesheetToolbar = React.memo(function TimesheetToolbar({
  employee,
  verificationMap,
  isSelectedVerified,
  isVerifying,
  canEdit,
  periodStatus,
  sidebarCollapsed,
  undoCount,
  redoCount,
  dirtyDayCount,
  dirtyCellCount,
  isSaving,
  onToggleSidebar,
  onToggleVerifyEmployee,
  onPrintIndividual,
  onPrintAll,
  onUndo,
  onRedo,
  onDiscardDirty,
  onSaveDirty,
}: TimesheetToolbarProps) {
  const isEditable = canEdit && periodStatus !== 'closed';

  return (
    <div className='border-border/60 bg-card flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-xs print:hidden'>
      {/* Left: Sidebar Toggle & Attendance Status */}
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onToggleSidebar}
          className='h-7 shrink-0 gap-1.5 px-2.5 text-xs font-medium'
          title={
            sidebarCollapsed
              ? 'Mở rộng danh sách nhân sự'
              : 'Thu gọn danh sách nhân sự'
          }
        >
          <Icons.panelLeft className='size-3.5' />
          <span>{sidebarCollapsed ? 'Hiện danh sách' : 'Thu gọn'}</span>
        </Button>

        <StatusBadge
          status={employeeStatus(employee, verificationMap)}
          mapping={statusMap}
          className='px-2 py-0.5 text-xs'
        />
      </div>

      {/* Right: Undo / Redo, Save Status, Individual Verification & Print/PDF */}
      <div className='ml-auto flex flex-wrap items-center gap-2'>
        {isEditable && (
          <>
            <div className='border-border bg-background inline-flex items-center overflow-hidden rounded-md border'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={onUndo}
                disabled={undoCount === 0 || isSaving}
                title='Hoàn tác (Ctrl+Z)'
                className='border-border/60 h-7 w-7 rounded-none border-r'
              >
                <Icons.restore className='size-3.5' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={onRedo}
                disabled={redoCount === 0 || isSaving}
                title='Làm lại (Ctrl+Y)'
                className='h-7 w-7 rounded-none'
              >
                <Icons.restore className='size-3.5 -scale-x-100' />
              </Button>
            </div>

            {dirtyDayCount > 0 ? (
              <>
                <Badge
                  variant='outline'
                  className='border-amber-500/40 bg-amber-500/10 text-xs font-medium text-amber-700 tabular-nums dark:text-amber-400'
                >
                  Chưa lưu: {dirtyCellCount} ô ({dirtyDayCount} ngày)
                </Badge>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={onDiscardDirty}
                  disabled={isSaving}
                  className='h-7 px-2.5 text-xs font-medium'
                >
                  Hủy
                </Button>
                <Button
                  type='button'
                  size='sm'
                  onClick={onSaveDirty}
                  disabled={isSaving}
                  title='Lưu toàn bộ thay đổi (Ctrl+S)'
                  className='h-7 gap-1.5 px-3 text-xs font-medium tabular-nums'
                >
                  {isSaving ? (
                    <Spinner className='size-3.5' />
                  ) : (
                    <Icons.check className='size-3.5' />
                  )}
                  <span>
                    {isSaving ? 'Đang lưu…' : `Lưu thay đổi (${dirtyDayCount})`}
                  </span>
                </Button>
              </>
            ) : (
              <span className='text-muted-foreground flex items-center gap-1 px-1 text-xs'>
                <Icons.check className='size-3.5 text-emerald-600 dark:text-emerald-400' />
                <span>Đã đồng bộ</span>
              </span>
            )}

            <div className='bg-border hidden h-4 w-px sm:block' />
          </>
        )}

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
            'h-7 gap-1.5 px-2.5 text-xs font-medium',
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
              className='h-7 gap-1.5 px-2.5 text-xs'
            >
              <Icons.fileTypePdf className='text-muted-foreground size-3.5' />
              <span>In / PDF</span>
              <Icons.chevronDown className='size-3 opacity-60' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-40 text-xs'>
            <DropdownMenuItem
              onClick={onPrintIndividual}
              className='cursor-pointer gap-2 text-xs'
            >
              <Icons.user className='text-muted-foreground size-3.5' />
              <span>In bảng công cá nhân</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onPrintAll}
              className='cursor-pointer gap-2 text-xs'
            >
              <Icons.employee className='text-muted-foreground size-3.5' />
              <span>In toàn bộ kỳ công</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
