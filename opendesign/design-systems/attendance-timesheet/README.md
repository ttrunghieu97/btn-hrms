# Clean Minimal shadcn/ui Timesheet Workspace — Design System

Reusable product design system & interactive showcase for **BTN HRMS Attendance Management**, specifically crafted for the monthly period workspace (`/attendance/management/periods/2026-09?employeeId=LV831202`).

---

## 1. Brand Understanding & Redesign Thesis

The original attendance management page provided necessary business logic for timekeeping, but required visual refinement to eliminate clutter and achieve modern, minimal enterprise ergonomics:
- **Clean Minimal shadcn/ui Foundation**: Pure zinc neutral scale (`zinc-950` / `zinc-900` / `zinc-200` / `zinc-100`). Stark high-contrast primary actions, crisp 1px borders, compact padding, and zero unnecessary visual noise.
- **Enterprise Density**: Optimized for HR officers auditing 30 days of check-in/out timestamps, duty shifts, and meal allowances on a single screen without horizontal scroll exhaustion.
- **Visual Distinction for Special Days**: Sundays and Saturdays are cleanly muted with subtle tinting and clear badge markers.
- **5-Tile High-Impact KPI Strip**: Clean summary header breaking down Công chính, Tăng ca OT, Trực ca & Phụ cấp, Thưởng & Giảm trừ, and Thực lĩnh tạm tính.
- **Bi-directional Employee URL Sync**: Explicit support for `?employeeId=LV831202` reflecting in active states, breadcrumbs, and detail sheet calculations.

---

## 2. Sources Consulted

1. **Production Codebase**:
   - `apps/web/src/features/attendance/timesheet-editor/timesheet-editor-page.tsx`
   - `apps/web/src/features/attendance/timesheet-editor/components/detail-sheet.tsx`
   - `apps/web/src/features/attendance/timesheet-editor/detail-columns.ts`
   - `apps/web/src/features/attendance/timesheet-editor/kpi-summary.ts`
   - `apps/web/src/features/attendance/timesheet-editor/hooks/use-employee-url-sync.ts`
2. **Authoritative PostgreSQL Database Records**:
   - Employee `LV831202` (`Lifecycle Test831202`) records in `attendance_daily_summaries` across `2026-09-01` through `2026-09-30`.
   - Peer employee records: `GP14187`, `GP37667`, `GP41530`, `GP79594`, `GP89487`.
3. **Official UI Specifications**:
   - Official shadcn/ui default dark/white Zinc theme tokens.
   - Lucide iconography and Tailwind status token palette.

---

## 3. Directory Index

```
opendesign/design-systems/attendance-timesheet/
├── README.md                                  # You are here
├── SKILL.md                                   # Portable agent skill definition
├── tokens/
│   └── colors_and_type.css                    # Canonical tokens file (discovery marker)
├── fonts/
│   └── README.md                              # Geist typography configuration
├── assets/
│   ├── logos/logo-vang.png                    # Official company logo
│   └── icons/favicon.ico                      # App favicon
├── brand/
│   ├── voice-and-tone.md                      # Vietnamese microcopy guidelines
│   └── style-notes.md                         # Visual foundations & table ergonomics
└── ui-kit-attendance/
    ├── components/                            # JSX Component specifications
    │   ├── Button.jsx
    │   ├── Badge.jsx
    │   ├── Card.jsx
    │   ├── Input.jsx
    │   ├── Select.jsx
    │   ├── Table.jsx
    │   ├── StatTile.jsx
    │   ├── EmployeeListItem.jsx
    │   ├── AdjustmentModal.jsx
    │   ├── ClosePeriodModal.jsx
    │   └── TimesheetToolbar.jsx
    └── index.html                             # Complete interactive showcase (LV831202)
```

---

## 4. How to Review Interactively

1. Start OpenDesign viewer or direct HTTP server:
   ```bash
   python3 -m http.server 8080
   ```
2. Navigate to `http://localhost:8080/opendesign/` or directly open:
   `opendesign/design-systems/attendance-timesheet/ui-kit-attendance/index.html`
3. Features available in the interactive showcase:
   - Live switching between Light mode and Dark mode.
   - Employee switcher supporting `LV831202` and colleagues with real September 2026 data.
   - Click any date row to trigger the audited adjustment modal with reason selection.
   - "Chốt bảng công" trigger with warning for missing data.
   - Component library and design token inspector tabs.
