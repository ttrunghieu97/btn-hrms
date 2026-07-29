'use client';

import * as React from 'react';
import { useTimesheet } from './hooks/use-timesheet';
import { useDirtyCells } from './hooks/use-dirty-cells';
import { usePeriodLock } from './hooks/use-period-lock';
import { useFillHandler } from './hooks/use-fill-handler';
import { daysInMonth, cellKey } from './types';
import type { TimesheetWorkspaceRecord } from './types';

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

    const bg = isDirty
      ? 'bg-emerald-950/20 border-y border-emerald-500/20'
      : isToday
        ? 'bg-slate-800/40'
        : isWeekend
          ? 'bg-slate-800/10'
          : '';

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

  const canEdit = ts.periodStatus === 'open';
  const canLock = ts.periodStatus === 'open';
  const canUnlock = ts.periodStatus === 'locked';
  const days = daysInMonth(ts.period);

  // Employee list from workspace response
  const employeeMap = React.useMemo(() => {
    const m = new Map<string, { id: string; code: string; name: string; dept: string | null }>();
    for (const emp of ts.employees) {
      m.set(emp.id, { id: emp.id, code: emp.employeeCode, name: emp.fullName, dept: emp.departmentName });
    }
    return m;
  }, [ts.employees]);

  // Filter + sort
  const employees = React.useMemo(() => {
    const list = Array.from(employeeMap.values());
    let filtered = list;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q));
    }
    if (deptFilter) {
      filtered = filtered.filter((e) => e.dept === deptFilter);
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [employeeMap, search, deptFilter]);

  // Departments for filter
  const departments = React.useMemo(() => {
    const s = new Set<string>();
    for (const e of employeeMap.values()) {
      if (e.dept) s.add(e.dept);
    }
    return Array.from(s).sort();
  }, [employeeMap]);

  // Per-employee progress
  const employeeFilled = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ts.records) {
      if (r.status && !['absent', 'leave', 'holiday', 'off'].includes(r.status)) {
        m.set(r.employeeId, (m.get(r.employeeId) ?? 0) + 1);
      }
    }
    return m;
  }, [ts.records]);

  const selectedProgress = selectedEmployeeId ? employeeFilled.get(selectedEmployeeId) ?? 0 : 0;

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

        {/* Status */}
        <span className={`rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-xs font-semibold ${
          ts.periodStatus === 'open' ? 'text-emerald-400' : ts.periodStatus === 'locked' ? 'text-amber-400' : ts.periodStatus === 'payroll_processing' ? 'text-blue-400' : 'text-slate-400'
        }`}>
          {ts.periodStatus?.toUpperCase() ?? 'UNKNOWN'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {dc.dirtyCount > 0 && <span className="text-xs text-slate-400">{dc.dirtyCount} modified</span>}
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={dc.saving || dc.dirtyCount === 0}
              className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-500"
            >
              {dc.saving ? 'Saving...' : `Save Changes (${dc.dirtyCount})`}
            </button>
          )}
          {canLock && <button type="button" onClick={() => setShowLock(true)} className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-500">Lock Period</button>}
          {canUnlock && <button type="button" onClick={() => setShowUnlock(true)} className="rounded-md border border-rose-600/50 bg-rose-950/30 px-4 py-1.5 text-sm font-semibold text-rose-400 hover:bg-rose-950/50">Unlock</button>}
        </div>
      </div>

      {showLock && <LockModal period={ts.period} onClose={() => setShowLock(false)} onConfirm={handleLock} />}
      {showUnlock && <UnlockModal period={ts.period} onClose={() => setShowUnlock(false)} onConfirm={handleUnlock} />}

      {/* ── Company Progress ── */}
      {(() => {
        const total = employees.length;
        const completed = employees.filter((e) => (employeeFilled.get(e.id) ?? 0) === days).length;
        const inProgress = employees.filter((e) => {
          const f = employeeFilled.get(e.id) ?? 0;
          return f > 0 && f < days;
        }).length;
        const notStarted = total - completed - inProgress;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        return total > 0 ? (
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{ts.period}</span>
              <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-300">{pct}%</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{completed} completed</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{inProgress} in progress</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-600" />{notStarted} not started</span>
            </div>
          </div>
        ) : null;
      })()}

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
              const filled = employeeFilled.get(emp.id) ?? 0;
              const pct = days > 0 ? Math.round((filled / days) * 100) : 0;
              const isSelected = emp.id === selectedEmployeeId;
      const color = pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-amber-400' : 'text-slate-500';
      const statusLabel = pct === 100 ? 'COMPLETE' : pct > 0 ? 'IN PROGRESS' : 'NOT STARTED';
      const statusColor = pct === 100 ? 'text-emerald-400 border-emerald-500/30' : pct > 0 ? 'text-amber-400 border-amber-500/30' : 'text-slate-500 border-slate-600/30';
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`flex w-full items-center gap-2 border-b border-slate-800/40 px-3 py-2 text-left text-sm transition-colors ${
                    isSelected ? 'bg-emerald-950/30 border-l-2 border-l-emerald-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <span className="flex-1 truncate min-w-0">
                    <span className="block text-slate-200">{emp.name}</span>
                    <span className="block text-[10px] text-slate-500">{emp.code}{emp.dept ? ` · ${emp.dept}` : ''}</span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className={`shrink-0 text-xs font-semibold ${color}`}>{filled}/{days}</span>
                    <span className={`text-[9px] font-medium uppercase ${pct === 100 ? 'text-emerald-500' : pct > 0 ? 'text-amber-500' : 'text-slate-600'}`}>{statusLabel}</span>
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
              {/* Employee header */}
              <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
                <div>
                  <h3 className="font-bold text-slate-100">{selected.name}</h3>
                  <p className="text-xs text-slate-500">{selected.code}{selected.dept ? ` · ${selected.dept}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Progress</span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: days > 0 ? `${(selectedProgress / days) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-xs text-slate-400">{selectedProgress}/{days}</span>
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
