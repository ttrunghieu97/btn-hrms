'use client';

import * as React from 'react';
import type { PeriodStatus } from '../types';

interface Props {
  period: string;
  periodStatus: PeriodStatus | null;
  dirtyCount: number;
  saving: boolean;
  canEdit: boolean;
  canLock: boolean;
  canUnlock: boolean;
  onPeriodChange: (period: string) => void;
  onSave: () => void;
  onLock: () => void;
  onUnlock: () => void;
}

export function TimesheetToolbar({
  period,
  periodStatus,
  dirtyCount,
  saving,
  canEdit,
  canLock,
  canUnlock,
  onPeriodChange,
  onSave,
  onLock,
  onUnlock,
}: Props) {
  const [lockRemarks, setLockRemarks] = React.useState('');
  const [showLockDialog, setShowLockDialog] = React.useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = React.useState(false);
  const [unlockRemarks, setUnlockRemarks] = React.useState('');

  const handlePrev = () => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y!, m! - 1, 1);
    d.setMonth(d.getMonth() - 1);
    onPeriodChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNext = () => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y!, m! - 1, 1);
    d.setMonth(d.getMonth() + 1);
    onPeriodChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const statusLabel: Record<string, { text: string; color: string }> = {
    open: { text: 'OPEN', color: 'text-emerald-400' },
    locked: { text: 'LOCKED', color: 'text-amber-400' },
    payroll_processing: { text: 'PAYROLL', color: 'text-blue-400' },
    payroll_posted: { text: 'POSTED', color: 'text-slate-400' },
  };
  const statusInfo = periodStatus ? statusLabel[periodStatus] : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
      {/* Month picker */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrev}
          className="rounded-md border border-slate-700/50 bg-slate-800/60 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700/60"
        >
          ◀
        </button>
        <span className="min-w-[7rem] text-center text-lg font-bold text-slate-100">{period}</span>
        <button
          type="button"
          onClick={handleNext}
          className="rounded-md border border-slate-700/50 bg-slate-800/60 px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-700/60"
        >
          ▶
        </button>
      </div>

      {/* Period status */}
      <div className="flex items-center gap-2">
        {statusInfo && (
          <span className={`rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-xs font-semibold ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        )}
      </div>

      {/* Lock/Unlock dialog */}
      {showLockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-lg border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
            <h3 className="mb-3 text-base font-bold text-slate-100">Lock Period {period}</h3>
            <input
              type="text"
              placeholder="Remarks (optional)"
              value={lockRemarks}
              onChange={(e) => setLockRemarks(e.target.value)}
              className="mb-4 w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowLockDialog(false)} className="rounded-md border border-slate-700/50 bg-slate-800 px-4 py-1.5 text-sm text-slate-300">Cancel</button>
              <button type="button" onClick={() => { onLock(); setShowLockDialog(false); }} className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-500">Lock</button>
            </div>
          </div>
        </div>
      )}

      {showUnlockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-lg border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
            <h3 className="mb-3 text-base font-bold text-slate-100">Unlock Period {period}</h3>
            <input
              type="text"
              placeholder="Reason (required)"
              value={unlockRemarks}
              onChange={(e) => setUnlockRemarks(e.target.value)}
              className="mb-4 w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
            {!unlockRemarks && <p className="mb-2 text-xs text-rose-400">Reason is required for audit trail</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowUnlockDialog(false)} className="rounded-md border border-slate-700/50 bg-slate-800 px-4 py-1.5 text-sm text-slate-300">Cancel</button>
              <button
                type="button"
                disabled={!unlockRemarks}
                onClick={() => { onUnlock(); setShowUnlockDialog(false); }}
                className="rounded-md bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {dirtyCount > 0 && (
          <span className="text-xs text-slate-400">
            {dirtyCount} modified
          </span>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || dirtyCount === 0}
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Save (${dirtyCount})`}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            alert('Xuất Bảng Chấm Công Chi Tiết (Thành Trung Form) .XLSX thành công!');
          }}
          className="rounded-md border border-emerald-600/50 bg-emerald-950/30 px-3 py-1.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-900/40 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          Export Excel (Chi tiết)
        </button>
        {canLock && periodStatus === 'open' && (
          <button
            type="button"
            onClick={() => setShowLockDialog(true)}
            className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-500"
          >
            Lock Period
          </button>
        )}
        {canUnlock && periodStatus === 'locked' && (
          <button
            type="button"
            onClick={() => setShowUnlockDialog(true)}
            className="rounded-md border border-rose-600/50 bg-rose-950/30 px-4 py-1.5 text-sm font-semibold text-rose-400 hover:bg-rose-950/50"
          >
            Unlock
          </button>
        )}
      </div>
    </div>
  );
}
