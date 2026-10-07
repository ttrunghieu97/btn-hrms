import React, { useState } from 'react';
import { Button } from './Button';

export function ClosePeriodModal({
  isOpen,
  onClose,
  onConfirm,
  period,
  missingCount = 0,
}) {
  const [remarks, setRemarks] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-lg text-[var(--fg-1)]">
        <h2 className="text-sm font-bold">Chốt bảng công tháng {period}</h2>
        
        <div className="my-3 rounded-md bg-[var(--surface-subtle)] p-3 text-xs leading-relaxed text-[var(--fg-2)]">
          {missingCount > 0 ? (
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Lưu ý: Còn <strong>{missingCount} nhân viên</strong> chưa đủ công trong kỳ này. Dữ liệu hiện tại sẽ được đóng băng để chuyển sang tính lương.
            </p>
          ) : (
            <p>
              Tất cả dữ liệu công đã được xác thực hợp lệ. Kỳ công sẽ được chuyển tiếp sang phân hệ Payroll.
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-[11px] font-medium text-[var(--fg-2)] mb-1">
            Ghi chú đóng kỳ (Tùy chọn)
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Ví dụ: Đã đối soát ngày 30/09..."
            className="w-full h-8 rounded-md border border-[var(--border-subtle)] bg-transparent px-2.5 text-xs text-[var(--fg-1)] focus:outline-none focus:ring-1 focus:ring-[var(--fg-1)]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onConfirm(remarks)}
          >
            Xác nhận Chốt kỳ
          </Button>
        </div>
      </div>
    </div>
  );
}
