'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { attendanceUiCopy, employeeUiCopy } from '@/lib/app-copy';

interface LunchDutyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lunchDutyType: 'indoor' | 'outdoor' | null;
  onLunchDutyTypeChange: (type: 'indoor' | 'outdoor' | null) => void;
  onContinue: () => void;
}

export function LunchDutyDialog({
  open,
  onOpenChange,
  lunchDutyType,
  onLunchDutyTypeChange,
  onContinue,
}: LunchDutyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-lg font-bold flex items-center gap-2">
          <span>{employeeUiCopy.attendance.presence.selectLunchDutyTitle}</span>
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground mt-1">
          {employeeUiCopy.attendance.presence.selectLunchDutyDesc}
        </DialogDescription>

        <div className="grid grid-cols-1 gap-4 mt-4" role="radiogroup">
          <button
            type="button"
            role="radio"
            aria-checked={lunchDutyType === 'indoor'}
            onClick={() => onLunchDutyTypeChange('indoor')}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-200 cursor-pointer ${
              lunchDutyType === 'indoor'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card hover:bg-muted/50'
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-lg">
              🏢
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{employeeUiCopy.attendance.presence.trucTruaTrongNhaTitle}</p>
              <p className="text-xs text-muted-foreground leading-normal">
                {employeeUiCopy.attendance.presence.trucTruaTrongNhaDesc}
              </p>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={lunchDutyType === 'outdoor'}
            onClick={() => onLunchDutyTypeChange('outdoor')}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-200 cursor-pointer ${
              lunchDutyType === 'outdoor'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card hover:bg-muted/50'
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-lg">
              ☀️
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{employeeUiCopy.attendance.presence.trucTruaNgoaiTroiTitle}</p>
              <p className="text-xs text-muted-foreground leading-normal">
                {employeeUiCopy.attendance.presence.trucTruaNgoaiTroiDesc}
              </p>
            </div>
          </button>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {attendanceUiCopy.lunchDuty.cancel}
          </Button>
          <Button
            disabled={!lunchDutyType}
            onClick={onContinue}
            className="flex-1"
          >
            {attendanceUiCopy.lunchDuty.continue}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
