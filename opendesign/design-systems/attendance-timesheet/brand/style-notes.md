# Visual Foundations — Minimal shadcn/ui Timesheet

## 1. Color System
- **Strict Monochrome**: Zinc palette dominates 95% of the visual space. Light mode is crisp white with zinc-200 borders; Dark mode is deep zinc-950 with zinc-800 borders.
- **Accents only for semantics**:
  - Emerald for completed work, present days, positive bonus.
  - Amber for weekend, partial days, or data warnings.
  - Red for deficit hours, absent, or destructive actions.
  - Sky for overtime (OT) or duty hours.

## 2. Table Ergonomics & Density
- **Row Height**: 32px - 36px per table row for high data density without feeling cramped.
- **Header Structure**: Two-tier header grouping related fields (Ca sáng, Ca chiều, Nghỉ & Trực, Tổng giờ làm).
- **Sticky Column Shadows**: Sticky `Ngày` and `Thứ` have a subtle right border shadow to distinguish them during horizontal scrolling.
- **Sunday Tinting**: Sundays receive a subtle shaded background (`bg-muted/30`) to visually anchor weekly cadence.
