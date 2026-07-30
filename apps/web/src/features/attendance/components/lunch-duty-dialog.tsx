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
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-lg shadow-xl backdrop-blur-md">
        <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>{employeeUiCopy.attendance.presence.selectLunchDutyTitle}</span>
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-400 mt-1">
          {employeeUiCopy.attendance.presence.selectLunchDutyDesc}
        </DialogDescription>

        <div className="grid grid-cols-1 gap-4 mt-6" role="radiogroup">
          <button
            type="button"
            role="radio"
            aria-checked={lunchDutyType === 'indoor'}
            onClick={() => onLunchDutyTypeChange('indoor')}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-350 ${
              lunchDutyType === 'indoor'
                ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-lg">
              🏢
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">{employeeUiCopy.attendance.presence.trucTruaTrongNhaTitle}</p>
              <p className="text-xs text-slate-400 leading-normal">
                {employeeUiCopy.attendance.presence.trucTruaTrongNhaDesc}
              </p>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={lunchDutyType === 'outdoor'}
            onClick={() => onLunchDutyTypeChange('outdoor')}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-350 ${
              lunchDutyType === 'outdoor'
                ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 text-lg">
              ☀️
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">{employeeUiCopy.attendance.presence.trucTruaNgoaiTroiTitle}</p>
              <p className="text-xs text-slate-400 leading-normal">
                {employeeUiCopy.attendance.presence.trucTruaNgoaiTroiDesc}
              </p>
            </div>
          </button>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-slate-800 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
          >
            {attendanceUiCopy.lunchDuty.cancel}
          </Button>
          <Button
            disabled={!lunchDutyType}
            onClick={onContinue}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            {attendanceUiCopy.lunchDuty.continue}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
