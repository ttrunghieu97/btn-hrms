// Pure column model + formatters for the per-employee daily detail grid.
// Mirrors the approved mockup's 18 physical columns (two-row header:
// "Tổng giờ làm" spans Giờ/Phút).

export const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;
export const DAY_FULL = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'] as const;

export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay();
}

export function isWeekend(dateStr: string): boolean {
  const d = getDayOfWeek(dateStr);
  return d === 0 || d === 6;
}

/** HH:mm from an ISO timestamp, '-' when absent. */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const trimmed = iso.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':');
    return `${h!.padStart(2, '0')}:${m}`;
  }
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return '-';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

/** minutes → 'HH:mm' (e.g. 71 → '01:11'). */
export function fmtDuration(mins: number | null | undefined): string {
  const m = Number(mins);
  if (!Number.isFinite(m) || m <= 0) return '00:00';
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return `${String(h).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/** minutes → '1' for full day (>=8h), '0.5' for partial (>=4h), '—' for <4h or zero. */
export function fmtWork(mins: number | null | undefined): string {
  const m = Number(mins);
  if (!Number.isFinite(m) || m < 240) return '—';
  if (m >= 480) return '1';
  return '0.5';
}

export function dayDate(period: string, day: number): string {
  return `${period}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(y!, m!, 0).getDate();
}

// ─── Header model (19 physical columns) ────────────────────────────────

export interface DetailHeaderCell {
  label: string;
  sub?: string;
  /** When set, this cell spans `span` columns. */
  span?: number;
  /** When set, this cell spans `rowSpan` rows. */
  rowSpan?: number;
  align?: 'left' | 'right' | 'center';
  width?: string;
  className?: string;
}

/** Row 1: Pinned columns (rowSpan 2), group headers (colSpan 2/4), and metric columns (rowSpan 2) */
const R1: DetailHeaderCell[] = [
  { label: 'Ngày', rowSpan: 2, align: 'center', width: 'w-[44px] min-w-[44px] max-w-[44px]' },
  { label: 'Thứ', rowSpan: 2, align: 'center', width: 'w-[44px] min-w-[44px] max-w-[44px]' },
  { label: 'Ca sáng', span: 2, align: 'center' },
  { label: 'Ca chiều', span: 2, align: 'center', className: 'col-divider-r' },
  { label: 'Nghỉ & Trực', span: 4, align: 'center', className: 'col-divider-r' },
  { label: 'Tổng giờ', span: 2, align: 'center', className: 'col-divider-r' },
  { label: 'Công chính', sub: 'chuẩn 8h', rowSpan: 2, align: 'center', width: 'w-[70px] min-w-[70px]' },
  { label: 'Tăng ca', sub: 'giờ', rowSpan: 2, align: 'center', width: 'w-[56px] min-w-[56px]' },
  { label: 'Thiếu công', sub: 'giờ', rowSpan: 2, align: 'center', width: 'w-[64px] min-w-[64px]' },
  { label: 'Trực đêm', sub: 'lần', rowSpan: 2, align: 'center', width: 'w-[56px] min-w-[56px]' },
  { label: 'Đứng nước', sub: 'lần', rowSpan: 2, align: 'center', width: 'w-[56px] min-w-[56px]', className: 'col-divider-r' },
  { label: 'Trạng thái & Ghi chú', rowSpan: 2, align: 'left', width: 'w-[140px] min-w-[140px]' },
];

/** Row 2: Sub-columns under the spanned category headers only */
const R2: DetailHeaderCell[] = [
  { label: 'Vào', align: 'center', width: 'w-[56px] min-w-[56px]' },
  { label: 'Ra', align: 'center', width: 'w-[56px] min-w-[56px]' },
  { label: 'Vào', align: 'center', width: 'w-[56px] min-w-[56px]' },
  { label: 'Ra', align: 'center', width: 'w-[56px] min-w-[56px]', className: 'col-divider-r' },
  { label: 'Nghỉ trưa', align: 'center', width: 'w-[62px] min-w-[62px]' },
  { label: 'Việc riêng', align: 'center', width: 'w-[62px] min-w-[62px]' },
  { label: 'Trực trưa', align: 'center', width: 'w-[62px] min-w-[62px]' },
  { label: 'Trực 35k', align: 'center', width: 'w-[62px] min-w-[62px]', className: 'col-divider-r' },
  { label: 'Giờ', align: 'center', width: 'w-[44px] min-w-[44px]' },
  { label: 'Phút', align: 'center', width: 'w-[44px] min-w-[44px]', className: 'col-divider-r' },
];

/** Cells per row, ready for rendering. */
export function detailHeaderRows(): { cells: DetailHeaderCell[]; isRow2: boolean }[] {
  return [{ cells: R1, isRow2: false }, { cells: R2, isRow2: true }];
}

