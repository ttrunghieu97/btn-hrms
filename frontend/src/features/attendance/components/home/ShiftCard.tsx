import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { TodayShiftDto } from '@/api/generated/model';
import { employeeUiCopy } from '@/lib/app-copy';

interface ShiftCardProps {
  shift: TodayShiftDto | null;
}

export function ShiftCard({ shift }: ShiftCardProps) {
  if (!shift) {
    return (
      <Card className="border-slate-700/50 bg-slate-800/80 text-slate-100 shadow-xl backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">{employeeUiCopy.attendance.presence.todayShiftCardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <Icons.info className="h-10 w-10 text-slate-500 mb-2" />
          <p className="text-base font-medium">{employeeUiCopy.attendance.presence.noShiftToday}</p>
          <p className="text-xs text-slate-500 mt-1">{employeeUiCopy.attendance.presence.shiftScheduleEmptyToday}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-700/50 bg-slate-800/80 text-slate-100 shadow-xl backdrop-blur-md">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-slate-400">{employeeUiCopy.attendance.presence.todayShiftCardTitle}</CardTitle>
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
          {employeeUiCopy.attendance.presence.shiftScheduledBadge}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700/50">
            <Icons.clock className="h-5 w-5 text-slate-300" />
          </div>
          <div>
            <h4 className="text-base font-semibold">{shift.name}</h4>
            <p className="text-sm text-slate-400">
              {employeeUiCopy.attendance.presence.timePeriodPrefix} <span className="font-mono">{shift.startTime} - {shift.endTime}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700/50">
            <Icons.department className="h-5 w-5 text-slate-300" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300">{employeeUiCopy.attendance.presence.requiredLocation}</h4>
            <p className="text-sm text-slate-400">{shift.locationName}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
