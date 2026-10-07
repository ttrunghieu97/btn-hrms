import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';

export function AdjustmentModal({
  isOpen,
  onClose,
  onConfirm,
  employeeName,
  workDate,
  initialHours = '8.0',
  initialStatus = 'present',
}) {
  const [status, setStatus] = useState(initialStatus);
  const [hours, setHours] = useState(initialHours);
  const [reason, setReason] = useState('manual_correction');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      onConfirm({ status, hours, reason, note });
      setSubmitting(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-lg text-[var(--fg-1)]">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-sm font-bold">Điều chỉnh giờ công</h2>
            <p className="text-xs text-[var(--fg-2)] font-mono mt-0.5">
              {employeeName} · Ngày: <span className="font-semibold text-[var(--fg-1)]">{workDate}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--fg-3)] hover:text-[var(--fg-1)] text-sm font-mono p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-[var(--fg-2)] mb-1">
              Trạng thái công
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-8 rounded-md border border-[var(--border-subtle)] bg-transparent px-2 text-xs text-[var(--fg-1)] focus:outline-none focus:ring-1 focus:ring-[var(--fg-1)]"
            >
              <option value="present">Công thường (Có mặt)</option>
              <option value="late">Đi muộn</option>
              <option value="early_leave">Về sớm</option>
              <option value="leave">Nghỉ phép</option>
              <option value="holiday">Nghỉ lễ</option>
              <option value="absent">Vắng mặt (Không công)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--fg-2)] mb-1">
              Số công / Giờ làm (giờ)
            </label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--fg-2)] mb-1">
              Lý do điều chỉnh (Bắt buộc Audit)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-8 rounded-md border border-[var(--border-subtle)] bg-transparent px-2 text-xs text-[var(--fg-1)] focus:outline-none focus:ring-1 focus:ring-[var(--fg-1)]"
            >
              <option value="manual_correction">HR nhập thủ công / Quên quẹt thẻ</option>
              <option value="policy_exception">Ngoại lệ chính sách / Công tác</option>
              <option value="data_fix">Sửa lỗi thiết bị chấm công</option>
              <option value="reconciliation">Đối soát dữ liệu kỳ công</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--fg-2)] mb-1">
              Ghi chú chi tiết
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú đối soát nếu có…"
              className="w-full rounded-md border border-[var(--border-subtle)] bg-transparent p-2 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-3)] focus:outline-none focus:ring-1 focus:ring-[var(--fg-1)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" variant="default" size="sm" isLoading={submitting}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
