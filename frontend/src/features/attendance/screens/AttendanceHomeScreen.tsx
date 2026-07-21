'use client';

import * as React from 'react';
import { useAttendanceHome, AttendanceState, AttendanceUIState } from '../hooks/useAttendanceHome';
import { ShiftCard } from '../components/home/ShiftCard';
import { GPSStatusBadge } from '../components/home/GPSStatusBadge';
import { AttendanceActionButton } from '../components/home/AttendanceActionButton';
import { Icons } from '@/components/icons';
import { toDateString } from '../utils/attendance-utils';
import { employeeUiCopy } from '@/lib/app-copy';

const SESSION_LABELS: Record<string, string> = {
  MORNING: employeeUiCopy.attendance.presence.sessionLabels.morning,
  LUNCH_DUTY: employeeUiCopy.attendance.presence.sessionLabels.lunchDuty,
  AFTERNOON: employeeUiCopy.attendance.presence.sessionLabels.afternoon,
  NIGHT: employeeUiCopy.attendance.presence.sessionLabels.night,
  OT: employeeUiCopy.attendance.presence.sessionLabels.ot,
};

const SESSION_ICONS: Record<string, string> = {
  MORNING: '☀️',
  LUNCH_DUTY: '🍱',
  AFTERNOON: '🌙',
  NIGHT: '🌃',
  OT: '⏰',
};

const SESSION_ORDER: Record<string, number> = {
  MORNING: 0,
  LUNCH_DUTY: 1,
  AFTERNOON: 2,
  NIGHT: 3,
  OT: 4,
};

function SessionStatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') {
    return <span className="text-xs font-medium text-emerald-400">{employeeUiCopy.attendance.presence.completedStatusBadge}</span>;
  }
  if (status === 'IN_PROGRESS') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {employeeUiCopy.attendance.presence.inProgressStatusBadge}
      </span>
    );
  }
  if (status === 'MISSED') return <span className="text-xs font-medium text-red-400">{employeeUiCopy.attendance.presence.missedStatusBadge}</span>;
  if (status === 'CANCELLED') return <span className="text-xs font-medium text-slate-500">{employeeUiCopy.attendance.presence.cancelledStatusBadge}</span>;
  return <span className="text-xs font-medium text-slate-500">{employeeUiCopy.attendance.presence.notStartedStatusBadge}</span>;
}

const SESSION_THEMES: Record<string, { border: string; bg: string; text: string }> = {
  MORNING: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-950/10',
    text: 'text-amber-400',
  },
  LUNCH_DUTY: {
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-950/10',
    text: 'text-emerald-400',
  },
  AFTERNOON: {
    border: 'border-indigo-500/20',
    bg: 'bg-indigo-950/10',
    text: 'text-indigo-400',
  },
  NIGHT: {
    border: 'border-violet-500/20',
    bg: 'bg-violet-950/10',
    text: 'text-violet-400',
  },
  OT: {
    border: 'border-rose-500/20',
    bg: 'bg-rose-950/10',
    text: 'text-rose-400',
  },
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 phút';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

function SessionCard({
  type, status, plannedStart, plannedEnd, actualStart, actualEnd, onAction,
}: {
  type: string; status: string; plannedStart: string | null; plannedEnd: string | null;
  actualStart: string | null; actualEnd: string | null;
  onAction: (type: string, action: 'checkin' | 'checkout') => void;
}) {
  const theme = SESSION_THEMES[type] ?? {
    border: 'border-slate-700/50',
    bg: 'bg-slate-800/60',
    text: 'text-slate-200',
  };

  return (
    <div className={`rounded-lg border ${theme.border} ${theme.bg} p-4 transition-all duration-300 hover:scale-[1.01] hover:bg-slate-800/40`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{SESSION_ICONS[type] ?? '📋'}</span>
          <span className={`font-semibold ${theme.text}`}>{SESSION_LABELS[type] ?? type}</span>
        </div>
        <SessionStatusBadge status={status} />
      </div>

      {/* Planned time */}
      {(plannedStart || plannedEnd) && (
        <div className="text-xs text-slate-500 mb-2 font-medium">
          {employeeUiCopy.attendance.presence.timePeriodPrefix}{plannedStart} – {plannedEnd}
        </div>
      )}

      {/* Actual times */}
      <div className="space-y-1 text-sm">
        {actualStart && (
          <div className="flex items-center gap-2 text-slate-300">
            <Icons.login className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono">{new Date(actualStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        {actualEnd && (
          <div className="flex items-center gap-2 text-slate-300">
            <Icons.logout className="h-3.5 w-3.5 text-rose-400" />
            <span className="font-mono">{new Date(actualEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>

      {/* Check-in/out button inside SessionCard */}
      {(status === 'READY' || status === 'IN_PROGRESS') && (
        <button
          type="button"
          onClick={() => onAction(type, status === 'READY' ? 'checkin' : 'checkout')}
          className={`w-full mt-4 rounded-md py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-[1.02] border ${
            status === 'READY'
              ? 'border-emerald-500/20 bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-sm'
              : 'border-rose-500/20 bg-rose-600/90 hover:bg-rose-500 text-white shadow-sm'
          }`}
        >
          {status === 'READY' ? 'Check In' : 'Check Out'}
        </button>
      )}
    </div>
  );
}

interface AttendanceHomeScreenProps {
  onPunch: (date: string, session: 'morning' | 'noon' | 'afternoon', action: 'checkin' | 'checkout') => void;
}

export function AttendanceHomeScreen({ onPunch }: AttendanceHomeScreenProps) {
  const {
    state, sessions, activeSession, shift, geofence,
    uiState,
    gpsPermission, gpsError, isGpsValid,
    canCheckIn, canCheckOut,
    refetchLocation,
    error,
  } = useAttendanceHome();

  // Client-side calculate total working time
  const totalWorkingSeconds = React.useMemo(() => {
    let total = 0;
    for (const s of sessions) {
      if (s.actualStart) {
        const start = new Date(s.actualStart).getTime();
        const end = s.actualEnd ? new Date(s.actualEnd).getTime() : Date.now();
        if (end > start) {
          total += Math.floor((end - start) / 1000);
        }
      }
    }
    return total;
  }, [sessions]);

  const hasAnyPunch = React.useMemo(() => {
    return sessions.some(s => s.actualStart != null);
  }, [sessions]);

  const handleSessionAction = (type: string, action: 'checkin' | 'checkout') => {
    const sessionTypeToLabel: Record<string, "morning" | "noon" | "afternoon"> = {
      MORNING: "morning",
      LUNCH_DUTY: "noon",
      AFTERNOON: "afternoon",
      NIGHT: "afternoon",
      OT: "afternoon",
    };
    const sessionLabel = sessionTypeToLabel[type] ?? "morning";
    onPunch(toDateString(new Date()), sessionLabel, action);
  };

  // Error state: show message instead of infinite spinner
  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-12 backdrop-blur-md">
        <Icons.alertCircle className="h-10 w-10 text-slate-500 mb-2" />
        <p className="text-sm font-medium text-slate-300">
          Không thể tải dữ liệu chấm công. Vui lòng thử lại sau.
        </p>
      </div>
    );
  }

  if (state === AttendanceState.INITIALIZING || uiState === AttendanceUIState.PROCESSING) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-12 backdrop-blur-md">
        <Icons.spinner className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm font-medium text-slate-300">
          {uiState === AttendanceUIState.PROCESSING
            ? employeeUiCopy.attendance.presence.loadingPhotoAndGps
            : employeeUiCopy.attendance.presence.loadingAttendanceData}
        </p>
      </div>
    );
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => (SESSION_ORDER[a.type] ?? 99) - (SESSION_ORDER[b.type] ?? 99),
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">{employeeUiCopy.attendance.presence.dailyCheckInTitle}</h2>
          {hasAnyPunch && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-400 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {employeeUiCopy.attendance.presence.workedDurationPrefix}{formatDuration(totalWorkingSeconds)}
            </div>
          )}
        </div>
        <p className="text-sm text-slate-400">{employeeUiCopy.attendance.presence.shiftInstructions}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left column: Shift card and primary action buttons */}
        <div className="space-y-4">
          <ShiftCard shift={shift} />

          {/* GPS status */}
          {!!(geofence && geofence.latitude && geofence.longitude && geofence.radiusMeters) && 
            (state === AttendanceState.READY || state === AttendanceState.NO_SHIFT) && (
              <GPSStatusBadge gpsPermission={gpsPermission} gpsError={gpsError} isGpsValid={isGpsValid} onRefresh={refetchLocation} />
          )}

          {/* Primary action button */}
          {(canCheckIn || canCheckOut) && (activeSession || state === AttendanceState.NO_SHIFT) && (
            <AttendanceActionButton
              state={state}
              isGpsValid={isGpsValid}
              canCheckIn={canCheckIn}
              canCheckOut={canCheckOut}
              onCheckIn={() => {
                const sessionTypeToLabel: Record<string, "morning" | "noon" | "afternoon"> = {
                  MORNING: "morning",
                  LUNCH_DUTY: "noon",
                  AFTERNOON: "afternoon",
                };
                const label = activeSession ? (sessionTypeToLabel[activeSession.type] ?? 'morning') : 'morning';
                onPunch(toDateString(new Date()), label, 'checkin');
              }}
              onCheckOut={() => {
                const sessionTypeToLabel: Record<string, "morning" | "noon" | "afternoon"> = {
                  MORNING: "morning",
                  LUNCH_DUTY: "noon",
                  AFTERNOON: "afternoon",
                };
                const label = activeSession ? (sessionTypeToLabel[activeSession.type] ?? 'morning') : 'morning';
                onPunch(toDateString(new Date()), label, 'checkout');
              }}
              isLoading={false}
            />
          )}

          {/* Fallback button when no actionable session */}
          {!activeSession && !canCheckIn && !canCheckOut && state !== (AttendanceState as any).INITIALIZING && (
            <AttendanceActionButton
              state={state}
              isGpsValid={isGpsValid}
              canCheckIn={false}
              canCheckOut={false}
              onCheckIn={() => {}}
              onCheckOut={() => {}}
              isLoading={false}
            />
          )}
        </div>

        {/* Right column: Sessions list */}
        <div className="space-y-4">
          {sortedSessions.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{employeeUiCopy.attendance.presence.todaySessionsTitle}</h3>
              {sortedSessions.map((s) => (
                <SessionCard key={s.id} {...s} onAction={handleSessionAction} />
              ))}
            </div>
          ) : state === AttendanceState.NO_SHIFT && sortedSessions.length === 0 ? (
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-4 text-center">
              <p className="text-sm text-slate-400">{employeeUiCopy.attendance.presence.noShiftToday}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
