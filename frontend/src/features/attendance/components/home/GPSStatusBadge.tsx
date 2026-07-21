import * as React from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';

interface GPSStatusBadgeProps {
  gpsPermission: 'prompt' | 'granted' | 'denied';
  gpsError: string | null;
  isGpsValid: boolean;
  onRefresh: () => void;
}

export function GPSStatusBadge({
  gpsPermission,
  gpsError,
  isGpsValid,
  onRefresh,
}: GPSStatusBadgeProps) {
  if (gpsPermission === 'denied' || gpsError) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
        <div className="flex items-center gap-2">
          <Icons.warning className="h-4 w-4 shrink-0" />
          <span>
            {gpsError || employeeUiCopy.attendance.presence.gpsPermissionDenied}
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex h-6 items-center justify-center rounded bg-rose-500/20 px-2 py-1 font-medium hover:bg-rose-500/30 active:scale-95"
        >
          <Icons.refresh className="mr-1 h-3 w-3" /> {commonUiCopy.retry}
        </button>
      </div>
    );
  }

  if (gpsPermission === 'prompt') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">
        <div className="flex items-center gap-2">
          <Icons.spinner className="h-4 w-4 animate-spin shrink-0" />
          <span>{employeeUiCopy.attendance.presence.verifyingGpsLocation}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg p-3 text-xs border transition-colors',
        isGpsValid
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            isGpsValid ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
          )}
        />
        <span>
          {isGpsValid
            ? employeeUiCopy.attendance.presence.gpsWithinRange
            : employeeUiCopy.attendance.presence.gpsOutOfRange}
        </span>
      </div>
      <button
        onClick={onRefresh}
        className={cn(
          'inline-flex h-6 items-center justify-center rounded px-2.5 py-1 font-medium hover:bg-slate-700/50 transition active:scale-95',
          isGpsValid ? 'bg-emerald-500/10 hover:bg-emerald-500/25' : 'bg-rose-500/10 hover:bg-rose-500/25'
        )}
      >
        <Icons.refresh className="h-3 w-3" />
      </button>
    </div>
  );
}
