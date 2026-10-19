'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import type { ActiveCell } from '../timesheet-calculations';

interface TimesheetToolbarProps {
  activeCell: ActiveCell | null;
  undoCount: number;
  redoCount: number;
  dirtyDayCount: number;
  dirtyCellCount: number;
  isSaving: boolean;
  onQuickFillStandardMonth: () => void;
  onQuickFillActiveDay: () => void;
  onClearActiveDay: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscardDirty: () => void;
  onSaveDirty: () => void;
}

export function TimesheetToolbar({
  activeCell,
  undoCount,
  redoCount,
  dirtyDayCount,
  dirtyCellCount,
  isSaving,
  onQuickFillStandardMonth,
  onQuickFillActiveDay,
  onClearActiveDay,
  onUndo,
  onRedo,
  onDiscardDirty,
  onSaveDirty,
}: TimesheetToolbarProps) {
  return (
    <div className='border-border/60 bg-card flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs print:hidden'>
      {/* Left: Section Title & Quick-Fill Actions */}
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-foreground text-sm font-semibold'>Chi tiết ngày công</span>

        <div className='bg-border hidden h-4 w-px sm:block' />

        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onQuickFillStandardMonth}
          title='Tự động điền ca chuẩn (08:00–12:00, 13:30–17:30) cho tất cả ngày Thứ 2 – Thứ 7 còn trống'
          className='h-7 gap-1.5 px-2.5 text-xs font-medium'
        >
          <Icons.sparkles className='size-3.5 text-emerald-600 dark:text-emerald-400' />
          <span>Điền ca chuẩn (T2–T7)</span>
        </Button>

        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onQuickFillActiveDay}
          title='Điền nhanh đủ công (08:00–12:00, 13:30–17:30) cho ngày đang chọn'
          className='h-7 gap-1 px-2.5 text-xs font-medium tabular-nums'
        >
          <Icons.add className='size-3.5' />
          <span>Đủ công ngày {activeCell ? String(activeCell.day).padStart(2, '0') : '01'}</span>
        </Button>

        {activeCell && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onClearActiveDay}
            title='Xóa dữ liệu công của ngày đang chọn'
            className='text-muted-foreground hover:text-destructive h-7 gap-1 px-2 text-xs font-medium tabular-nums'
          >
            <Icons.trash className='size-3.5' />
            <span>Xóa ngày {String(activeCell.day).padStart(2, '0')}</span>
          </Button>
        )}
      </div>

      {/* Right: Undo / Redo & Staged Batch Save */}
      <div className='ml-auto flex items-center gap-2'>
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
              {isSaving ? <Spinner className='size-3.5' /> : <Icons.check className='size-3.5' />}
              <span>{isSaving ? 'Đang lưu…' : `Lưu thay đổi (${dirtyDayCount})`}</span>
            </Button>
          </>
        ) : (
          <span className='text-muted-foreground flex items-center gap-1 px-1.5 text-xs'>
            <Icons.check className='size-3.5 text-emerald-600 dark:text-emerald-400' />
            <span>Đã đồng bộ</span>
          </span>
        )}
      </div>
    </div>
  );
}
