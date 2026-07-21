import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { AttendanceState } from '../../hooks/useAttendanceHome';
import { cn } from '@/lib/utils';
import { employeeUiCopy } from '@/lib/app-copy';

interface AttendanceActionButtonProps {
  state: AttendanceState;
  isGpsValid: boolean;
  canCheckIn?: boolean;
  canCheckOut?: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  isLoading: boolean;
}

export function AttendanceActionButton({
  state,
  isGpsValid,
  canCheckIn: propCanCheckIn,
  canCheckOut: propCanCheckOut,
  onCheckIn,
  onCheckOut,
  isLoading,
}: AttendanceActionButtonProps) {
  if (state === AttendanceState.INITIALIZING || isLoading) {
    return (
      <Button
        disabled
        className="w-full bg-slate-800 border border-slate-700 text-slate-400 py-6 text-base font-semibold rounded-lg"
      >
        <Icons.spinner className="mr-2 h-5 w-5 animate-spin" />
        {employeeUiCopy.attendance.presence.loadingAttendanceData}
      </Button>
    );
  }

  if (state === AttendanceState.NO_SHIFT) {
    // canCheckIn from backend reflects policy.allowCheckInWithoutShift
    if (propCanCheckIn === false) {
      return (
        <Button
          disabled
          className="w-full bg-slate-800 text-slate-500 py-6 text-base font-semibold rounded-lg cursor-not-allowed"
        >
          {employeeUiCopy.attendance.presence.noScheduledShiftToday}
        </Button>
      );
    }
    // Policy allows check-in — fall through to normal button
  }

  if (state === AttendanceState.COMPLETED) {
    return (
      <Button
        disabled
        className="w-full bg-emerald-950/30 border border-emerald-900/50 text-emerald-500 py-6 text-base font-semibold rounded-lg cursor-default"
      >
        <Icons.check className="mr-2 h-5 w-5" />
        {employeeUiCopy.attendance.presence.completedWorkday}
      </Button>
    );
  }

  const isCheckIn = state === AttendanceState.READY || state === AttendanceState.NO_SHIFT;
  const isDisabled = isCheckIn
    ? !(isGpsValid && propCanCheckIn !== false)
    : propCanCheckOut === false;
  const buttonText = isCheckIn 
    ? employeeUiCopy.attendance.presence.checkInButtonText 
    : employeeUiCopy.attendance.presence.checkOutButtonText;
  const handleAction = isCheckIn ? onCheckIn : onCheckOut;

  return (
    <Button
      disabled={isDisabled}
      onClick={handleAction}
      className={cn(
        'w-full py-6 text-base font-semibold rounded-lg transition-all duration-300 transform active:scale-[0.98]',
        isCheckIn
          ? isDisabled
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-[2px]'
          : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 hover:-translate-y-[2px]'
      )}
    >
      {isCheckIn ? (
        <Icons.login className="mr-2 h-5 w-5" />
      ) : (
        <Icons.logout className="mr-2 h-5 w-5" />
      )}
      {buttonText}
    </Button>
  );
}
