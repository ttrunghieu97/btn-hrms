'use client';

import Image from 'next/image';
import type { ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { attendanceUiCopy, employeeUiCopy } from '@/lib/app-copy';
import {
  calculateTotalHours,
  formatAttendanceDate,
  formatTime,
  getDayOfWeek,
  toSessionRecord,
  toDateString,
  type MyAttendanceDayRecord
} from '../../utils/attendance-utils';

function parseDurationLabel(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatDecimalHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function getTotalMinutes(row: MyAttendanceDayRecord): number | null {
  const total = calculateTotalHours(toSessionRecord(row));
  if (!total) return null;
  return parseDurationLabel(total);
}

interface EvidenceCellProps {
  time: string | null | undefined;
  image: string | null | undefined;
  meta: any;
  label: string;
  date: string;
  session: 'morning' | 'noon' | 'afternoon';
  action: 'checkin' | 'checkout';
  lunchDutyType?: string | null;
  isFuture: boolean;
  onPunch: (date: string, session: 'morning' | 'noon' | 'afternoon', action: 'checkin' | 'checkout') => void;
}

function EvidenceCell({
  time,
  image,
  meta,
  label,
  date,
  session,
  action,
  isFuture,
  onPunch,
  lunchDutyType
}: EvidenceCellProps) {
  if (time) {
    const formatted = formatTime(time);
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 font-mono font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 hover:border-emerald-500/40 rounded px-2 py-1 text-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>{formatted}</span>
            {image && <Icons.camera className="h-3 w-3 opacity-80 shrink-0" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 bg-slate-900 border-slate-800 text-slate-100 rounded-lg shadow-xl backdrop-blur-md space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-emerald-400 border-b border-slate-800 pb-1.5">
            <span>{label}</span>
            <span className="font-mono text-slate-400">{formatted}</span>
          </div>
          {lunchDutyType && (
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-1">
              <span className="text-[11px] font-medium text-slate-400">{employeeUiCopy.attendance.presence.registeredShift}:</span>
              <span className={lunchDutyType === 'outdoor' ? 'text-xs font-semibold text-amber-400' : 'text-xs font-semibold text-emerald-400'}>
                {lunchDutyType === 'outdoor' ? employeeUiCopy.attendance.presence.outdoorDutyBadge : employeeUiCopy.attendance.presence.indoorDutyBadge}
              </span>
            </div>
          )}
          {image && (
            <div className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-800 bg-slate-950">
              <Image src={image} alt={label} fill className="object-cover" unoptimized />
            </div>
          )}
          <div className="space-y-1 text-[11px] text-slate-400 font-mono">
            <div>{employeeUiCopy.attendance.presence.gpsLabel} {meta?.gps ? <span className="text-slate-300">{meta.gps}</span> : <span className="text-slate-500 italic">{employeeUiCopy.attendance.presence.skipGpsLabel}</span>}</div>
            <div>{employeeUiCopy.attendance.presence.ipLabel} {meta?.ip ? <span className="text-slate-300">{meta.ip}</span> : <span className="text-slate-500 italic">{attendanceUiCopy.table.notAvailable}</span>}</div>
            <div>{employeeUiCopy.attendance.presence.verificationPrefix}{meta?.verificationStatus === 'success' ? <span className="text-emerald-400">{employeeUiCopy.attendance.presence.verifiedBadge}</span> : <span className="text-amber-400">{employeeUiCopy.attendance.presence.missingPhotoBadge}</span>}</div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (isFuture) {
    return <span className="text-xs text-slate-600">-</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onPunch(date, session, action)}
      className="flex items-center justify-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-slate-100 transition-all border border-slate-700/50 active:scale-95 shrink-0 cursor-pointer"
    >
      <Icons.camera className="h-3.5 w-3.5" />
      <span>{action === 'checkin' ? attendanceUiCopy.timekeeping.table.in : attendanceUiCopy.timekeeping.table.out}</span>
    </button>
  );
}

export const getColumns = (
  onPunch: (date: string, session: 'morning' | 'noon' | 'afternoon', action: 'checkin' | 'checkout') => void
): ColumnDef<MyAttendanceDayRecord>[] => [
  {
    id: 'date',
    accessorKey: 'date',
    header: attendanceUiCopy.timekeeping.table.date,
    enableSorting: false,
    cell: ({ row }) => (
      <span className='text-xs font-semibold text-slate-300'>{formatAttendanceDate(row.original.date)}</span>
    )
  },
  {
    id: 'dayOfWeek',
    header: employeeUiCopy.attendance.presence.dayOfWeekHeader,
    enableSorting: false,
    cell: ({ row }) => (
      <span className='text-xs text-slate-500 font-medium'>{getDayOfWeek(row.original.date)}</span>
    )
  },
  {
    id: 'morningCheckin',
    header: employeeUiCopy.attendance.presence.morningCheckInHeader,
    enableSorting: false,
    cell: ({ row }) => {
      const rec = row.original;
      const todayStr = toDateString(new Date());
      const isToday = rec.date === todayStr;
      const currentHour = new Date().getHours();
      const canPunch = isToday && currentHour < 12;
      return (
        <EvidenceCell
          time={rec.morningCheckin}
          image={rec.morningCheckinImage}
          meta={rec.morningCheckinMeta}
          label={employeeUiCopy.attendance.presence.morningSessionInLabel}
          date={rec.date}
          session="morning"
          action="checkin"
          isFuture={!canPunch}
          onPunch={onPunch}
        />
      );
    }
  },
  {
    id: 'morningCheckout',
    header: employeeUiCopy.attendance.presence.morningCheckOutHeader,
    enableSorting: false,
    cell: ({ row }) => {
      const rec = row.original;
      const todayStr = toDateString(new Date());
      const isToday = rec.date === todayStr;
      const currentHour = new Date().getHours();
      const canPunch = isToday && currentHour < 12 && !!rec.morningCheckin;
      return (
        <EvidenceCell
          time={rec.morningCheckout}
          image={rec.morningCheckoutImage}
          meta={rec.morningCheckoutMeta}
          label={employeeUiCopy.attendance.presence.morningSessionOutLabel}
          date={rec.date}
          session="morning"
          action="checkout"
          isFuture={!canPunch}
          onPunch={onPunch}
        />
      );
    }
  },
  {
    id: 'noonCheckIndoor',
    header: employeeUiCopy.attendance.presence.noonCheckIndoorHeader,
    enableSorting: false,
    cell: ({ row }) => {
      const rec = row.original;
      const todayStr = toDateString(new Date());
      const isToday = rec.date === todayStr;
      const currentHour = new Date().getHours();
      const canPunch = isToday && currentHour >= 11;
      if (rec.lunchDutyType === 'outdoor') {
        return <span className="text-xs text-slate-600">-</span>;
      }
      return (
        <EvidenceCell
          time={rec.noonCheck}
          image={rec.noonCheckImage}
          meta={rec.noonCheckMeta}
          label={employeeUiCopy.attendance.presence.noonCheckIndoorHeader}
          date={rec.date}
          session="noon"
          action="checkin"
          isFuture={!canPunch}
          onPunch={onPunch}
          lunchDutyType="indoor"
        />
      );
    }
  },
  {
    id: 'noonCheckOutdoor',
    header: employeeUiCopy.attendance.presence.noonCheckOutdoorHeader,
    enableSorting: false,
    cell: ({ row }) => {
      const rec = row.original;
      if (rec.lunchDutyType !== 'outdoor') {
        return <span className="text-xs text-slate-600">-</span>;
      }
      return (
        <EvidenceCell
          time={rec.noonCheck}
          image={rec.noonCheckImage}
          meta={rec.noonCheckMeta}
          label={employeeUiCopy.attendance.presence.noonCheckOutdoorHeader}
          date={rec.date}
          session="noon"
          action="checkin"
          isFuture={true}
          onPunch={onPunch}
          lunchDutyType="outdoor"
        />
      );
    }
  },
  {
    id: 'afternoonCheckin',
    header: employeeUiCopy.attendance.presence.afternoonCheckInHeader,
    enableSorting: false,
    cell: ({ row }) => {
      const rec = row.original;
      const todayStr = toDateString(new Date());
      const isToday = rec.date === todayStr;
      const currentHour = new Date().getHours();
      const canPunch = isToday && currentHour >= 12;
      return (
        <EvidenceCell
          time={rec.afternoonCheckin}
          image={rec.afternoonCheckinImage}
          meta={rec.afternoonCheckinMeta}
          label={employeeUiCopy.attendance.presence.afternoonSessionInLabel}
          date={rec.date}
          session="afternoon"
          action="checkin"
          isFuture={!canPunch}
          onPunch={onPunch}
        />
      );
    }
  },
  {
    id: 'afternoonCheckout',
    header: employeeUiCopy.attendance.presence.afternoonCheckOutHeader,
    enableSorting: false,
    cell: ({ row }) => {
      const rec = row.original;
      const todayStr = toDateString(new Date());
      const isToday = rec.date === todayStr;
      const currentHour = new Date().getHours();
      const canPunch = isToday && currentHour >= 12 && !!rec.afternoonCheckin;
      return (
        <EvidenceCell
          time={rec.afternoonCheckout}
          image={rec.afternoonCheckoutImage}
          meta={rec.afternoonCheckoutMeta}
          label={employeeUiCopy.attendance.presence.afternoonSessionOutLabel}
          date={rec.date}
          session="afternoon"
          action="checkout"
          isFuture={!canPunch}
          onPunch={onPunch}
        />
      );
    }
  },
  {
    id: 'totalHours',
    header: employeeUiCopy.attendance.presence.totalWorkHours,
    enableSorting: false,
    cell: ({ row }) => {
      const total = calculateTotalHours(toSessionRecord(row.original));
      return <span className='text-xs font-mono font-semibold text-sky-400'>{total || '-'}</span>;
    }
  },
  {
    id: 'overtimeHours',
    header: attendanceUiCopy.timekeeping.overtime,
    enableSorting: false,
    cell: ({ row }) => {
      const totalMinutes = getTotalMinutes(row.original);
      const overtimeMinutes = totalMinutes ? Math.max(totalMinutes - 8 * 60, 0) : 0;
      return (
        <span className='text-xs font-mono font-semibold text-rose-400'>
          {overtimeMinutes ? formatDecimalHours(overtimeMinutes) + 'h' : '-'}
        </span>
      );
    }
  },
  {
    id: 'note',
    accessorKey: 'note',
    header: employeeUiCopy.attendance.presence.noteHeader,
    enableSorting: false,
    cell: ({ row }) => <span className='text-xs text-slate-400 whitespace-normal block max-w-[150px]'>{row.original.note ?? '-'}</span>
  }
];
