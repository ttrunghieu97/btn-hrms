'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TimesheetWorkspaceRecord } from '../types';

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string; }> = {
  present: { text: '✓', color: 'text-emerald-400', bg: 'bg-emerald-950/30' },
  late: { text: '⚠', color: 'text-amber-400', bg: 'bg-amber-950/30' },
  early_leave: { text: '⚡', color: 'text-orange-400', bg: 'bg-orange-950/30' },
  absent: { text: '✗', color: 'text-red-400', bg: 'bg-red-950/30' },
  leave: { text: 'L', color: 'text-blue-400', bg: 'bg-blue-950/30' },
  holiday: { text: '🎉', color: 'text-purple-400', bg: 'bg-purple-950/30' },
  off: { text: 'OFF', color: 'text-slate-400', bg: 'bg-slate-950/30' },
  weekend: { text: '🌙', color: 'text-indigo-400', bg: 'bg-indigo-950/30' },
};

export function TimesheetEnhancedDayRow({
  day,
  dow,
  employeeId,
  record,
  canEdit,
  onCellChange,
  onStatusChange,
  onNoteClick,
}: {
  day: number;
  dow: number;
  employeeId: string;
  record?: TimesheetWorkspaceRecord;
  canEdit: boolean;
  onCellChange: (employeeId: string, workDate: string, checkIns: any[], status?: string, note?: string) => void;
  onStatusChange: (employeeId: string, workDate: string, status: string) => void;
  onNoteClick: (employeeId: string, workDate: string) => void;
}) {
  const [localCheckIns, setLocalCheckIns] = React.useState<any[]>(record?.checkIn ? [{ time: record.checkIn, type: 'system' }] : []);
  const [localStatus, setLocalStatus] = React.useState<string>(record?.status || 'present');
  const [localNote, setLocalNote] = React.useState<string>(record?.note || '');
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
  const [showNotePanel, setShowNotePanel] = React.useState(false);

  const dayDate = record?.workDate || '';
  const isWeekend = dow === 0 || dow === 6;
  const isToday = dayDate === new Date().toISOString().slice(0, 10);

  const statusInfo = STATUS_LABELS[localStatus] || STATUS_LABELS.present;

  const handleAddCheckIn = () => {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newCheckIn = {
      time: timeString,
      type: 'manual',
      source: 'HR',
    };
    const updated = [...localCheckIns, newCheckIn];
    setLocalCheckIns(updated);
    onCellChange(employeeId, dayDate, updated, localStatus, localNote);
  };

  const handleRemoveCheckIn = (index: number) => {
    const updated = localCheckIns.filter((_, i) => i !== index);
    setLocalCheckIns(updated);
    onCellChange(employeeId, dayDate, updated, localStatus, localNote);
  };

  const handleStatusChange = (newStatus: string) => {
    setLocalStatus(newStatus);
    onStatusChange(employeeId, dayDate, newStatus);
    setShowStatusDropdown(false);
  };

  const handleNoteChange = (value: string) => {
    setLocalNote(value);
    onCellChange(employeeId, dayDate, localCheckIns, localStatus, value);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getDayLabel = () => {
    if (isWeekend) return 'Weekend';
    if (localStatus === 'holiday') return 'Holiday';
    if (localStatus === 'leave') return 'Leave';
    if (localStatus === 'absent') return 'Absent';
    return 'Present';
  };

  return (
    <tr className={cn(
      'group border-b border-slate-800/40 transition-all duration-200 hover:bg-slate-800/40',
      isWeekend && 'bg-slate-900/20',
      isToday && 'bg-slate-800/30',
      localStatus === 'late' && 'border-l-2 border-l-amber-500',
      localStatus === 'early_leave' && 'border-l-2 border-l-orange-500',
    )}
    >
      {/* Day */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-300">{day}</span>
          <span className="text-xs text-slate-500">Day {day}</span>
        </div>
      </td>

      {/* Day of Week */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dow]}
          </span>
          {isWeekend && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
              Weekend
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-2">
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all',
              statusInfo.bg,
              'border-slate-700/50 hover:border-slate-600',
            )}
          >
            <span className={cn("text-sm font-semibold", statusInfo.color)}>{statusInfo.text}</span>
            <span className="text-xs font-medium text-slate-300">{getDayLabel()}</span>
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showStatusDropdown && (
            <div className="absolute top-full mt-1 left-0 z-50 w-48 rounded-md border border-slate-700/50 bg-slate-900/95 backdrop-blur-sm shadow-xl">
              {Object.entries(STATUS_LABELS).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-slate-800/60 transition-colors',
                    localStatus === key && 'bg-slate-800/60',
                  )}
                >
                  <span className={cn("inline-block w-5 text-center mr-2", info.color)}>{info.text}</span>
                  <span className="text-slate-300">{key.replace('_', ' ').toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Check-ins */}
      <td className="px-3 py-2">
        <div className="space-y-1">
          {localCheckIns.length > 0 ? (
            localCheckIns.map((checkIn, index) => (
              <div key={index} className="flex items-center gap-2 group/checkin">
                <span className="text-xs font-mono text-slate-400 w-16">
                  {formatTime(checkIn.time)}
                </span>
                <span className="text-xs text-slate-500">
                  {checkIn.type === 'system' ? '(Auto)' : '(Manual)'}
                </span>
                {canEdit && (
                  <button
                    onClick={() => handleRemoveCheckIn(index)}
                    className="opacity-0 group-hover/checkin:opacity-100 transition-opacity text-slate-500 hover:text-red-400"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-600">— No records</span>
          )}
          {canEdit && (
            <button
              onClick={handleAddCheckIn}
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              + Add Check-in
            </button>
          )}
        </div>
      </td>

      {/* Status & Analytics */}
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {record?.overtimeMinutes && record.overtimeMinutes > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              +{Math.floor(record.overtimeMinutes / 60)}h OT
            </span>
          )}
          {record?.lateMinutes && record.lateMinutes > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              +{record.lateMinutes}m Late
            </span>
          )}
          {record?.earlyLeaveMinutes && record.earlyLeaveMinutes > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
              -{record.earlyLeaveMinutes}m Early
            </span>
          )}
        </div>
      </td>

      {/* Personal Break */}
      <td className="px-3 py-2">
        {record?.personalBreakMinutes ? (
          <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
            {record.personalBreakMinutes}m Break
          </span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>

      {/* Note */}
      <td className="px-3 py-2">
        {record?.note ? (
          <button
            onClick={() => onNoteClick(employeeId, dayDate)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-help"
          >
            📝 {record.note.substring(0, 20)}{record.note.length > 20 ? '...' : ''}
          </button>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
        {showNotePanel && (
          <div className="absolute bottom-full mb-2 left-0 z-50 w-64 rounded-md border border-slate-700/50 bg-slate-900/95 backdrop-blur-sm p-3">
            <textarea
              value={localNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Add note..."
              className="w-full h-20 px-2 py-1 text-xs rounded border border-slate-700/50 bg-slate-800 text-slate-200 focus:border-blue-500/50 focus:outline-none resize-none"
            />
          </div>
        )}
      </td>

      {/* Total Hours */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400">
            {record?.workedMinutes ? `${Math.floor(record.workedMinutes / 60)}h${record.workedMinutes % 60}m` : '—'}
          </span>
          {record?.workedMinutes && record.workedMinutes > 480 && (
            <span className="text-xs text-orange-400">⚠️</span>
          )}
        </div>
      </td>
    </tr>
  );
}