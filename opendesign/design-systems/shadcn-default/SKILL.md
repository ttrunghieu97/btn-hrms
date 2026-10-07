---
name: shadcn-default-design-system
description: BTN HRMS shadcn/ui default dark/white theme — classic Zinc monochrome product system. Pure white background in light, zinc-950 in dark, stark black/white primary buttons, Geist typography, radius 0.5rem.
---

# shadcn/ui Default (Zinc Dark/White) — BTN HRMS Design System

Product surface tokens for BTN HRMS using canonical shadcn/ui default dark/white (Zinc).

## Palette
- **Light mode**:
  - Background & Card: `oklch(1 0 0)` (#ffffff).
  - Primary button: `oklch(0.205 0 0)` (#18181b / zinc-900 stark black) with white text.
  - Borders: `oklch(0.922 0 0)` (#e4e4e7 / zinc-200).
  - Foreground text: `oklch(0.145 0 0)` (#09090b / zinc-950).
- **Dark mode**:
  - Background & Card: `oklch(0.145 0 0)` (#09090b / zinc-950).
  - Primary button: `oklch(0.985 0 0)` (#fafafa / zinc-50 pure white) with black text.
  - Borders: `oklch(0.269 0 0)` (#27272a / zinc-800).
  - Foreground text: `oklch(0.985 0 0)` (#fafafa / zinc-50).

## Typography
- Sans = Geist (UI, tables, labels).
- Mono = Geist Mono (times, IDs, employee codes, numbers).
- Display = Instrument Serif (optional brand display).

## Status Semantics
- Success: Emerald
- Warning: Amber
- Destructive: Red-500/600
- Info: Sky-500
