'use client';

import * as React from 'react';
import { useTimesheet } from './hooks/use-timesheet';
import { useDirtyCells } from './hooks/use-dirty-cells';
import { usePeriodLock } from './hooks/use-period-lock';
import { useFillHandler } from './hooks/use-fill-handler';
import { daysInMonth, cellKey } from './types';
import type { TimesheetWorkspaceRecord, PeriodStatus } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return ''; }
}

function dayDate(period: string, day: number): string {
  return `${period}-${String(day).padStart(2, '0')}`;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay();
}

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function getRecord(records: TimesheetWorkspaceRecord[], employeeId: string, workDate: string): TimesheetWorkspaceRecord | undefined {
  return records.find((r) => r.employeeId === employeeId && r.workDate === workDate);
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  present: { text: '✓', color: 'text-emerald-400' },
  late: { text: '⚠', color: 'text-amber-400' },
  early_leave: { text: '⚡', color: 'text-amber-400' },
  absent: { text: '—', color: 'text-red-400' },
  leave: { text: 'L', color: 'text-blue-400' },
  holiday: { text: 'H', color: 'text-indigo-400' },
  off: { text: 'OFF', color: 'text-slate-500' },
};

// ─── Close Modal ────────────────────────────────────────────────────────

function CloseModal({ period, onClose, onConfirm }: { period: string; onClose: () => void; onConfirm: (remarks: string) => void }) {
  const [r, setR] = React.useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-96 rounded-lg border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
        <h3 className="mb-3 text-base font-bold text-slate-100">Close Period {period}</h3>
        <p className="mb-3 text-xs text-slate-400">Final closure — no further edits. Create immutable snapshot.</p>
        <input value={r} onChange={(e) => setR(e.target.value)} placeholder="Remarks (optional)" className="mb-4 w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700/50 bg-slate-800 px-4 py-1.5 text-sm text-slate-300">Cancel</button>
          <button type="button" onClick={() => onConfirm(r)} className="rounded-md bg-slate-600 px-4 py-1.5 text-sm font-semibold text-white">Close</button>
        </div>
      </div>
    </div>
  );
}

function ReopenModal({ period, onClose, onConfirm }: { period: string; onClose: () => void; onConfirm: (remarks: string) => void }) {
  const [r, setR] = React.useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-96 rounded-lg border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
        <h3 className="mb-3 text-base font-bold text-slate-100">Reopen Period {period}</h3>
        <input value={r} onChange={(e) => setR(e.target.value)} placeholder="Reason (required)" className="mb-4 w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
        {!r && <p className="mb-2 text-xs text-rose-400">Reason required</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700/50 bg-slate-800 px-4 py-1.5 text-sm text-slate-300">Cancel</button>
          <button type="button" disabled={!r} onClick={() => onConfirm(r)} className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Reopen</button>
        </div>
      </div>
    </div>
  );
}

// ─── Period Lock Modal ────────────────────────────────────────────────

function LockModal({ period, onClose, onConfirm }: { period: string; onClose: () => void; onConfirm: (remarks: string) => void }) {
  const [r, setR] = React.useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-96 rounded-lg border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
        <h3 className="mb-3 text-base font-bold text-slate-100">Lock Period {period}</h3>
        <input value={r} onChange={(e) => setR(e.target.value)} placeholder="Remarks (optional)" className="mb-4 w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700/50 bg-slate-800 px-4 py-1.5 text-sm text-slate-300">Cancel</button>
          <button type="button" onClick={() => onConfirm(r)} className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white">Lock</button>
        </div>
      </div>
    </div>
  );
}

function UnlockModal({ period, onClose, onConfirm }: { period: string; onClose: () => void; onConfirm: (remarks: string) => void }) {
  const [r, setR] = React.useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-96 rounded-lg border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
        <h3 className="mb-3 text-base font-bold text-slate-100">Unlock Period {period}</h3>
        <input value={r} onChange={(e) => setR(e.target.value)} placeholder="Reason (required)" className="mb-4 w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-2 text-sm text-slate-200" />
        {!r && <p className="mb-2 text-xs text-rose-400">Reason required</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700/50 bg-slate-800 px-4 py-1.5 text-sm text-slate-300">Cancel</button>
          <button type="button" disabled={!r} onClick={() => onConfirm(r)} className="rounded-md bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Unlock</button>
        </div>
      </div>
    </div>
  );
}

// ─── Fill Handle Icon ─────────────────────────────────────────────────

function FillHandle({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <span
      onMouseDown={onMouseDown}
      className="absolute -bottom-0.5 -right-0.5 z-10 h-2 w-2 cursor-ns-resize rounded-sm border border-emerald-400/60 bg-emerald-500/40 opacity-0 hover:opacity-100 group-hover/input:opacity-60"
    />
  );
}

// ─── Timesheet Detail Rows ────────────────────────────────────────────

function TimesheetDetail({
  employeeId,
  records,
  period,
  dirtyCells,
  canEdit,
  onCellChange,
}: {
  employeeId: string;
  records: TimesheetWorkspaceRecord[];
  period: string;
  dirtyCells: Map<string, { checkIn: string; checkOut: string }>;
  canEdit: boolean;
  onCellChange: (employeeId: string, workDate: string, checkIn: string, checkOut: string) => void;
}) {
  const days = daysInMonth(period);
  const fill = useFillHandler(employeeId, canEdit, onCellChange);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rows: React.ReactNode[] = [];
  let filled = 0;

  for (let d = 1; d <= days; d++) {
    const wd = dayDate(period, d);
    const record = getRecord(records, employeeId, wd);
    const key = cellKey(employeeId, wd);
    const dirty = dirtyCells.get(key);
    const dow = getDayOfWeek(wd);
    const isWeekend = dow === 0 || dow === 6;
    const isToday = wd === new Date().toISOString().slice(0, 10);
    const hasData = record?.status && !['absent', 'leave', 'holiday', 'off'].includes(record.status);
    if (hasData) filled++;

    const statusInfo = record?.status ? STATUS_LABEL[record.status] : null;
    const isDirty = Boolean(dirty);

    // Format check-in/check-out from ISO to HH:mm
    const defaultIn = dirty?.checkIn ?? (record?.checkIn ? formatTime(record.checkIn) : '');
    const defaultOut = dirty?.checkOut ?? (record?.checkOut ? formatTime(record.checkOut) : '');

    const [localIn, setLocalIn] = React.useState(defaultIn);
    const [localOut, setLocalOut] = React.useState(defaultOut);
    const [focused, setFocused] = React.useState(false);

    React.useEffect(() => {
      if (!focused) {
        setLocalIn(dirty?.checkIn ?? (record?.checkIn ? formatTime(record.checkIn) : ''));
        setLocalOut(dirty?.checkOut ?? (record?.checkOut ? formatTime(record.checkOut) : ''));
      }
    }, [dirty, focused, record?.checkIn, record?.checkOut]);

    const statusBg = record?.status === 'late' ? 'bg-amber-950/10 border-y border-amber-500/10'
      : record?.status === 'early_leave' ? 'bg-orange-950/10 border-y border-orange-500/10'
      : record?.status === 'absent' ? 'bg-red-950/10 border-y border-red-500/10'
      : record?.status === 'leave' ? 'bg-blue-950/10 border-y border-blue-500/10'
      : record?.status === 'holiday' ? 'bg-indigo-950/10 border-y border-indigo-500/10'
      : '';
    const bg = isDirty
      ? 'bg-emerald-950/20 border-y border-emerald-500/20'
      : statusBg
      || (isToday ? 'bg-slate-800/40' : '')
      || (isWeekend ? 'bg-slate-800/10' : '');

    rows.push(
      <tr key={wd} className={`border-b border-slate-800/40 ${bg}`}>
        <td className="px-3 py-2 text-xs text-slate-400">{d}</td>
        <td className="px-3 py-2 text-xs text-slate-500">{DAY_LABELS[dow]}</td>
        <td className="px-3 py-2">
          {statusInfo ? (
            <span className={`text-xs font-semibold ${statusInfo.color}`}>{statusInfo.text}</span>
          ) : (
            <span className="text-xs text-slate-600">—</span>
          )}
        </td>
        {canEdit ? (
          <>
            <td className="px-2 py-1.5">
              <div className="group/input relative inline-flex">
                <input
                  type="text"
                  inputMode="numeric"
                  value={localIn}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9:]/g, '').slice(0, 5);
                    if (/^\d{0,2}:?\d{0,2}$/.test(v)) setLocalIn(v);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => { setFocused(false); onCellChange(employeeId, wd, localIn, localOut); }}
                  placeholder="HH:mm"
                  className={`w-16 rounded border px-1.5 py-1 text-xs font-mono ${
                    isDirty ? 'border-emerald-500/40 bg-slate-800' : 'border-transparent bg-transparent'
                  } text-slate-200 focus:border-blue-500/50 focus:bg-slate-800 focus:outline-none`}
                />
                {canEdit && localIn && <FillHandle onMouseDown={() => fill.onFillStart(wd, 'checkIn', localIn)} />}
              </div>
            </td>
            <td className="px-2 py-1.5">
              <div className="group/input relative inline-flex">
                <input
                  type="text"
                  inputMode="numeric"
                  value={localOut}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9:]/g, '').slice(0, 5);
                    if (/^\d{0,2}:?\d{0,2}$/.test(v)) setLocalOut(v);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => { setFocused(false); onCellChange(employeeId, wd, localIn, localOut); }}
                  placeholder="HH:mm"
                  className={`w-16 rounded border px-1.5 py-1 text-xs font-mono ${
                    isDirty ? 'border-emerald-500/40 bg-slate-800' : 'border-transparent bg-transparent'
                  } text-slate-400 focus:border-blue-500/50 focus:bg-slate-800 focus:outline-none`}
                />
                {canEdit && localOut && <FillHandle onMouseDown={() => fill.onFillStart(wd, 'checkOut', localOut)} />}
              </div>
            </td>
          </>
        ) : (
          <>
            <td className="px-3 py-2 text-xs text-slate-500">—</td>
            <td className="px-3 py-2 text-xs text-slate-500">—</td>
          </>
        )}
        <td className="px-3 py-2 text-xs text-slate-500">{record?.workedMinutes ? `${Math.floor(record.workedMinutes / 60)}h${record.workedMinutes % 60}m` : ''}</td>
      </tr>,
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseMove={(e) => {
        if (!fill.fillRange || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        // Determine target day from mouse position (crude approximation via scroll + row height)
        const headerH = 36; // approx header height
        const rowH = 36; // approx row height
        const targetDay = Math.min(days, Math.max(1, Math.floor((relY - headerH) / rowH) + 1));
        fill.onFillMove(targetDay);
      }}
      onMouseUp={() => fill.onFillEnd(days, period)}
      onMouseLeave={() => { if (fill.fillRange) fill.onFillEnd(days, period); }}
    >
    <table className="w-full border-collapse">
      <thead>
        <tr className="sticky top-0 bg-slate-800/90 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <th className="px-3 py-2 text-left">Date</th>
          <th className="px-3 py-2 text-left">Day</th>
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2">Check-in</th>
          <th className="px-3 py-2">Check-out</th>
          <th className="px-3 py-2">Worked</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export function TimesheetEditorPage({ defaultPeriod }: { defaultPeriod?: string }) {
  const ts = useTimesheet(defaultPeriod);
  const dc = useDirtyCells();
  const pl = usePeriodLock();

  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [deptFilter, setDeptFilter] = React.useState('');
  const [showLock, setShowLock] = React.useState(false);
  const [showUnlock, setShowUnlock] = React.useState(false);
  const [showClose, setShowClose] = React.useState(false);
  const [showReopen, setShowReopen] = React.useState(false);

  const canEdit = ts.periodStatus === 'open';
  const canLock = ts.periodStatus === 'open';
  const canUnlock = ts.periodStatus === 'locked';
  const days = daysInMonth(ts.period);

  // Employee list from workspace response
  const employeeMap = React.useMemo(() => {
    const m = new Map<string, typeof ts.employees[0]>();
    for (const emp of ts.employees) m.set(emp.id, emp);
    return m;
  }, [ts.employees]);

  // Filter + sort
  const employees = React.useMemo(() => {
    let list = Array.from(employeeMap.values());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.fullName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q));
    }
    if (deptFilter) list = list.filter((e) => e.departmentName === deptFilter);
    return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employeeMap, search, deptFilter]);

  // Departments for filter
  const departments = React.useMemo(() => {
    const s = new Set<string>();
    for (const e of employeeMap.values()) {
      if (e.departmentName) s.add(e.departmentName);
    }
    return Array.from(s).sort();
  }, [employeeMap]);

  // Derive selected employee stats (already computed by BE)
  const selectedProgress = selectedEmployeeId ? (employeeMap.get(selectedEmployeeId)?.workingDays ?? 0) : 0;

  const handleCellChange = React.useCallback(
    (employeeId: string, workDate: string, checkIn: string, checkOut: string) => {
      dc.setDirty(employeeId, workDate, checkIn, checkOut);
    },
    [dc],
  );

  const handleSave = React.useCallback(async () => {
    const result = await dc.save(ts.period);
    if (result) ts.reload();
  }, [dc, ts]);

  const handleLock = React.useCallback(async (remarks: string) => {
    const ok = await pl.lock(ts.period, remarks);
    if (ok) ts.reload();
    setShowLock(false);
  }, [pl, ts]);

  const handleUnlock = React.useCallback(async (remarks: string) => {
    const ok = await pl.unlock(ts.period, remarks);
    if (ok) ts.reload();
    setShowUnlock(false);
  }, [pl, ts]);

  const handleClose = React.useCallback(async (remarks: string) => {
    const ok = await pl.close(ts.period, remarks);
    if (ok) ts.reload();
    setShowClose(false);
  }, [pl, ts]);

  const handleReopen = React.useCallback(async (remarks: string) => {
    const ok = await pl.reopen(ts.period, remarks);
    if (ok) ts.reload();
    setShowReopen(false);
  }, [pl, ts]);

  const handleReview = React.useCallback(async () => {
    const ok = await pl.review(ts.period);
    if (ok) ts.reload();
  }, [pl, ts]);

  const handleApprove = React.useCallback(async () => {
    const ok = await pl.approve(ts.period);
    if (ok) ts.reload();
  }, [pl, ts]);

  // Select first employee when list loads
  React.useEffect(() => {
    if (!selectedEmployeeId && employees.length > 0) {
      setSelectedEmployeeId(employees[0]!.id);
    }
  }, [employees, selectedEmployeeId]);

  // ─── Render ──────────────────────────────────────────────────────

  if (ts.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        <span className="ml-3 text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  if (ts.error) {
    return (
      <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-6 text-center">
        <p className="text-sm text-red-400">{ts.error}</p>
        <button type="button" onClick={ts.reload} className="mt-3 rounded-md bg-slate-800 px-4 py-1.5 text-sm text-slate-300">Retry</button>
      </div>
    );
  }

  const selected = selectedEmployeeId ? employeeMap.get(selectedEmployeeId) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const [y, m] = ts.period.split('-').map(Number);
              const d = new Date(y!, m! - 1, 1);
              d.setMonth(d.getMonth() - 1);
              ts.setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="rounded-md border border-slate-700/50 bg-slate-800/60 px-2.5 py-1 text-sm hover:bg-slate-700/60"
          >
            ◀
          </button>
          <span className="min-w-[7rem] text-center text-lg font-bold text-slate-100">{ts.period}</span>
          <button
            type="button"
            onClick={() => {
              const [y, m] = ts.period.split('-').map(Number);
              const d = new Date(y!, m! - 1, 1);
              d.setMonth(d.getMonth() + 1);
              ts.setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="rounded-md border border-slate-700/50 bg-slate-800/60 px-2.5 py-1 text-sm hover:bg-slate-700/60"
          >
            ▶
          </button>
        </div>

        {/* Actions — server-driven from BE */}
        <div className="flex items-center gap-2">
          {dc.dirtyCount > 0 && <span className="text-xs text-slate-400">{dc.dirtyCount} modified</span>}
          {ts.availableActions.includes('save') && (
            <button type="button" onClick={handleSave} disabled={dc.saving || dc.dirtyCount === 0}
              className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-500">{dc.saving ? 'Saving...' : `Save Changes (${dc.dirtyCount})`}</button>
          )}
          {ts.availableActions.includes('review') && <button type="button" onClick={handleReview} className="rounded-md border border-amber-500/50 bg-amber-950/30 px-4 py-1.5 text-sm font-semibold text-amber-400">Review Period</button>}
          {ts.availableActions.includes('approve') && <button type="button" onClick={handleApprove} className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">Approve</button>}
          {ts.availableActions.includes('lock') && <button type="button" onClick={() => setShowLock(true)} className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-500">Lock Period</button>}
          {ts.availableActions.includes('unlock') && <button type="button" onClick={() => setShowUnlock(true)} className="rounded-md border border-rose-600/50 bg-rose-950/30 px-4 py-1.5 text-sm font-semibold text-rose-400 hover:bg-rose-950/50">Unlock</button>}
          {ts.availableActions.includes('close') && <button type="button" onClick={() => setShowClose(true)} className="rounded-md bg-slate-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-500">Close Period</button>}
          {ts.availableActions.includes('reopen') && <button type="button" onClick={() => setShowReopen(true)} className="rounded-md border border-orange-600/50 bg-orange-950/30 px-4 py-1.5 text-sm font-semibold text-orange-400">Reopen</button>}
        </div>
      </div>

      {showLock && <LockModal period={ts.period} onClose={() => setShowLock(false)} onConfirm={handleLock} />}
      {showUnlock && <UnlockModal period={ts.period} onClose={() => setShowUnlock(false)} onConfirm={handleUnlock} />}
      {showClose && <CloseModal period={ts.period} onClose={() => setShowClose(false)} onConfirm={handleClose} />}
      {showReopen && <ReopenModal period={ts.period} onClose={() => setShowReopen(false)} onConfirm={handleReopen} />}

      {/* ── Period Dashboard (server-driven) ── */}
      {ts.totals ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{ts.period}</span>
              <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${ts.totals.totalEmployees > 0 ? (ts.totals.completedEmployees / ts.totals.totalEmployees) * 100 : 0}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-300">{ts.totals.totalEmployees > 0 ? Math.round((ts.totals.completedEmployees / ts.totals.totalEmployees) * 100) : 0}%</span>
            </div>
            <span className="text-xs text-slate-500">|</span>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{ts.totals.completedEmployees}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{ts.totals.inProgressEmployees}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-600" />{ts.totals.notStartedEmployees}</span>
            </div>
            <span className="text-xs text-slate-500">|</span>
            <div className="flex gap-2 text-xs text-slate-400">
              <span>⏱ {Math.round(ts.totals.totalWorkedMinutes / 60)}h</span>
              <span>⏰ {Math.round(ts.totals.totalOtMinutes / 60)}h OT</span>
              <span>⚠ {ts.totals.totalLateCount} late</span>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            ts.periodStatus === 'open' ? 'border-emerald-500/30 text-emerald-400' : ts.periodStatus === 'locked' ? 'border-amber-500/30 text-amber-400' : ts.periodStatus === 'payroll_processing' ? 'border-blue-500/30 text-blue-400' : ts.periodStatus === 'payroll_posted' ? 'border-indigo-500/30 text-indigo-400' : ts.periodStatus === 'closed' ? 'border-slate-500/30 text-slate-400' : 'border-slate-600/30 text-slate-500'
          }`}>{ts.periodStatus?.toUpperCase() ?? 'UNKNOWN'}</span>
        </div>
      ) : null}

      {/* ── Body: employee list + detail ── */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Left: employee list */}
        <div className="flex w-72 shrink-0 flex-col rounded-lg border border-slate-800/60 bg-slate-900/60">
          {/* Filters */}
          <div className="border-b border-slate-800/60 p-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="mb-2 w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500"
            />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {employees.map((emp) => {
              const pct = emp.completionRate;
              const isSelected = emp.id === selectedEmployeeId;
              return (
                <button key={emp.id} type="button" onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`flex w-full items-start gap-2 border-b border-slate-800/40 px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-emerald-950/30 border-l-2 border-l-emerald-500' : 'hover:bg-slate-800/40'}`}>
                  <span className="flex-1 truncate min-w-0">
                    <span className="block text-slate-200">{emp.fullName}</span>
                    <span className="block text-[10px] text-slate-500">{emp.employeeCode}{emp.departmentName ? ` · ${emp.departmentName}` : ''}</span>
                    <span className="mt-0.5 flex gap-2 text-[9px] text-slate-600">
                      <span>{emp.workingDays}wd</span>
                      {emp.lateCount > 0 && <span className="text-amber-500/80">{emp.lateCount} late</span>}
                      {emp.leaveCount > 0 && <span className="text-blue-500/80">{emp.leaveCount} leave</span>}
                      {emp.otMinutes > 0 && <span className="text-emerald-500/80">{Math.round(emp.otMinutes / 60)}h OT</span>}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className={`text-xs font-semibold ${pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{emp.workingDays}/{emp.totalDays}</span>
                    <span className={`text-[9px] font-medium uppercase ${pct === 100 ? 'text-emerald-500' : pct > 0 ? 'text-amber-500' : 'text-slate-600'}`}>{pct === 100 ? 'COMPLETE' : pct > 0 ? 'IN PROGRESS' : 'NOT STARTED'}</span>
                  </span>
                </button>
              );
            })}
            {employees.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-slate-500">No employees found</div>
            )}
          </div>
        </div>

        {/* Right: timesheet detail */}
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-800/60 bg-slate-900/60">
          {selected ? (
            <>
              {/* Employee header with stats */}
              <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
                <div>
                  <h3 className="font-bold text-slate-100">{selected.fullName}</h3>
                  <p className="text-xs text-slate-500">{selected.employeeCode}{selected.departmentName ? ` · ${selected.departmentName}` : ''}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex gap-2 text-slate-400">
                    <span className="text-emerald-400">{selected.workingDays}wd</span>
                    {selected.lateCount > 0 && <span className="text-amber-400">{selected.lateCount} late</span>}
                    {selected.leaveCount > 0 && <span className="text-blue-400">{selected.leaveCount} leave</span>}
                    {selected.absentCount > 0 && <span className="text-red-400">{selected.absentCount} absent</span>}
                    {selected.otMinutes > 0 && <span className="text-emerald-400">{Math.round(selected.otMinutes / 60)}h OT</span>}
                  </div>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${selected.completionRate}%` }} />
                  </div>
                  <span className="text-slate-400">{selected.workingDays}/{selected.totalDays}</span>
                </div>
              </div>
              {/* Table */}
              <div className="flex-1 overflow-auto">
                <TimesheetDetail
                  employeeId={selected.id}
                  records={ts.records}
                  period={ts.period}
                  dirtyCells={dc.dirtyCells}
                  canEdit={canEdit}
                  onCellChange={handleCellChange}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-sm text-slate-500">
              Select an employee
            </div>
          )}
        </div>
      </div>

      {/* ── Failed cells ── */}
      {dc.failedCells.length > 0 && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-400">
            Failed ({dc.failedCells.length})
          </h4>
          <div className="space-y-1">
            {dc.failedCells.map((f, i) => (
              <p key={i} className="text-xs text-slate-400">
                {f.employeeId.slice(0, 8)} · {f.workDate} — {f.reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
