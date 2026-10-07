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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{employeeUiCopy.attendance.presence.todayShiftCardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <Icons.info className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-base font-medium">{employeeUiCopy.attendance.presence.noShiftToday}</p>
          <p className="text-xs text-muted-foreground mt-1">{employeeUiCopy.attendance.presence.shiftScheduleEmptyToday}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{employeeUiCopy.attendance.presence.todayShiftCardTitle}</CardTitle>
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {employeeUiCopy.attendance.presence.shiftScheduledBadge}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icons.clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h4 className="text-base font-semibold">{shift.name}</h4>
            <p className="text-sm text-muted-foreground">
              {employeeUiCopy.attendance.presence.timePeriodPrefix} <span className="font-mono">{shift.startTime} - {shift.endTime}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icons.department className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">{employeeUiCopy.attendance.presence.requiredLocation}</h4>
            <p className="text-sm font-medium">{shift.locationName}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
