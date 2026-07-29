'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ShiftRosterRow, ShiftTemplateRow } from '../api/queries';
import type { RosterCellState } from './roster-types';
import { getShiftCategory } from './roster-types';

interface RosterCellProps {
  state: RosterCellState;
  templates: ShiftTemplateRow[];
  locations: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
  onAssignQuick: (templateId: string, locationId?: string, positionId?: string) => void;
  onCancel: (assignmentId: string) => void;
}

function ShiftBadge({ row, isLocked, onCancel }: { row: ShiftRosterRow; isLocked: boolean; onCancel: (id: string) => void }) {
  const category = getShiftCategory(row);
  return (
    <div className='group/shift relative flex flex-col justify-between rounded-lg border border-border/60 bg-muted/20 p-1.5 text-xs transition-all hover:border-primary/50 hover:shadow-sm'>
      <div className='flex items-center justify-between gap-1'>
        <Badge
          variant='outline'
          className={cn(
            'flex items-center gap-1 border-none px-1.5 py-0.5 font-medium text-[11px]',
            category === 'DAY' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            category === 'NIGHT' && 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
            category === 'SPLIT' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          )}
        >
          {category === 'DAY' && <Icons.sun className='h-3 w-3 shrink-0' />}
          {category === 'NIGHT' && <Icons.moon className='h-3 w-3 shrink-0' />}
          {category === 'SPLIT' && <Icons.galleryVerticalEnd className='h-3 w-3 shrink-0' />}
          <span className='truncate max-w-[80px]'>{row.shiftTemplateName}</span>
        </Badge>

        {!isLocked && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-5 w-5 opacity-0 group-hover/shift:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive'
            onClick={() => onCancel(row.assignmentId)}
            title='Hủy ca'
          >
            <Icons.close className='h-3 w-3' />
          </Button>
        )}
      </div>

      <div className='mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground'>
        <span>
          {row.startTime} - {row.endTime}
        </span>
        <span className='font-mono font-medium text-foreground/80'>
          {Math.round((row.scheduledMinutes / 60) * 10) / 10}h
        </span>
      </div>
    </div>
  );
}

export function RosterCell({
  state,
  templates,
  locations,
  positions,
  onAssignQuick,
  onCancel
}: RosterCellProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const { assignments, warnings, isLocked } = state;
  const hasAssignments = assignments.length > 0;

  const hasWarnings = warnings.length > 0;
  const criticalWarning = warnings.find((w) => w.severity === 'CRITICAL');

  // Quick assign popover (always available unless locked)
  const quickAssignButton = !isLocked ? (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={cn(
            'group flex w-full items-center justify-center rounded-lg border border-dashed border-transparent transition-all hover:border-border hover:bg-muted/30 focus-visible:outline-none',
            hasAssignments ? 'h-6 mt-1' : 'h-full min-h-[64px]'
          )}
          title='Thêm ca làm việc'
        >
          <div className={cn(
            'flex items-center justify-center rounded-full bg-muted/40 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary',
            hasAssignments ? 'h-5 w-5' : 'h-7 w-7'
          )}>
            <Icons.add className={cn(hasAssignments ? 'h-3 w-3' : 'h-4 w-4')} />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-56 p-2 rounded-lg shadow-lg' align='start'>
        <div className='text-xs font-semibold text-muted-foreground mb-2 px-1'>
          Gán ca làm việc nhanh
        </div>
        <div className='space-y-1 max-h-48 overflow-y-auto pr-1'>
          {templates.length === 0 ? (
            <div className='text-xs text-muted-foreground p-2 text-center'>Không có mẫu ca nào</div>
          ) : (
            templates.map((tpl) => (
              <button
                key={tpl.id}
                type='button'
                className='flex w-full items-center justify-between rounded-md p-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground'
                onClick={() => {
                  onAssignQuick(tpl.id);
                  setPopoverOpen(false);
                }}
              >
                <div className='flex flex-col'>
                  <span className='font-medium'>{tpl.name}</span>
                  <span className='text-[10px] text-muted-foreground'>
                    {tpl.startTime} - {tpl.endTime}
                  </span>
                </div>
                <Badge variant='outline' className='text-[10px] py-0 px-1 font-mono'>
                  {tpl.code}
                </Badge>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  ) : null;

  if (!hasAssignments) {
    if (isLocked) {
      return (
        <div className='flex h-full min-h-[64px] items-center justify-center text-muted-foreground/30 text-xs'>
          —
        </div>
      );
    }
    return quickAssignButton;
  }

  return (
    <div className='flex flex-col gap-1 min-h-[64px]'>
      {assignments.map((row) => (
        <ShiftBadge key={row.assignmentId} row={row} isLocked={isLocked} onCancel={onCancel} />
      ))}

      {hasWarnings && (
        <div className='flex items-center gap-1 text-[10px] text-amber-500 font-medium px-1'>
          <Icons.warning className='h-3 w-3 shrink-0' />
          <span className='truncate'>{criticalWarning?.message ?? warnings[0]?.message}</span>
        </div>
      )}

      {quickAssignButton}
    </div>
  );
}
