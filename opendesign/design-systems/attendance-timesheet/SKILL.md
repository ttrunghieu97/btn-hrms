---
name: attendance-timesheet-design-system
description: BTN HRMS Attendance & Timesheet Workspace design system. Clean, high-density, minimal shadcn/ui zinc monochrome design tailored for period-based attendance management (2026-09), dense timesheet grids, audited adjustments, and employee KPI calculations.
---

# BTN HRMS — Attendance & Timesheet Workspace Design System

This skill provides the design tokens, rules, and UI kit for the Attendance & Timesheet Management workspace in **BTN HRMS**, specifically redesigned for the period management route (`/attendance/management/periods/[period]?employeeId=[code]`).

## Core Principles

1. **High-Density Zinc Monochrome**: Stark contrast, clean 1px borders (`border-border/60`), zero decorative fluff. Pure white surface in light mode, deep zinc-950 (`#09090b`) in dark mode.
2. **Tabular Precision**: Times, dates, counts, and currency strictly formatted with `Geist Mono` (`tabular-nums`) to prevent jitter across dense data rows.
3. **Restrained Status Semantics**:
   - Good / Present / Đủ công: Emerald outline badge (`border-emerald-500/30 text-emerald-600 bg-emerald-500/10`)
   - Warning / Late / Thiếu công: Amber outline badge (`border-amber-500/30 text-amber-600 bg-amber-500/10`)
   - Danger / Absent: Red outline badge (`border-rose-500/30 text-rose-600 bg-rose-500/10`)
   - Overtime / Special duty: Sky badge (`border-sky-500/30 text-sky-600 bg-sky-500/10`)
4. **Primary Interaction**: Stark solid black button in light mode (`#18181b`), pure white button in dark mode (`#fafafa`).
5. **Two-Tier Grid Layout**: Two-row sticky header for morning shift, afternoon shift, breaks, duty allowances, worked hours, and notes.

## File Hierarchy

```
opendesign/design-systems/attendance-timesheet/
├── README.md                          # Human-facing index
├── SKILL.md                           # Portable skill marker
├── tokens/
│   └── colors_and_type.css            # Canonical OKLCH tokens
├── fonts/
│   └── README.md                      # Typography guidelines
├── assets/
│   ├── logos/logo-vang.png            # Official company logo
│   └── icons/favicon.ico              # Official favicon
├── brand/
│   ├── voice-and-tone.md              # Vietnamese HR terminology & audit rules
│   └── style-notes.md                 # Grid density & layout mechanics
└── ui-kit-attendance/
    ├── components/                    # Standalone JSX components
    └── index.html                     # Full interactive showcase (LV831202 in 2026-09)
```
