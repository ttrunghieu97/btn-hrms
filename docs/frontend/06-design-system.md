# Phase 4 — Visual Direction & Design System (`btn-hrms`)

## 1. Visual Direction & Design Philosophy

`btn-hrms` adopts an **Enterprise Editorial Precision** aesthetic tailored for dense, high-frequency HR and payroll operations:
- **Warm, Approachable Authority (`Coral` Default Theme)**: Uses a refined terracotta/coral primary accent (`oklch(0.55 0.16 25)` in light mode, `oklch(0.65 0.16 25)` in dark mode) paired with warm alabaster surfaces (`oklch(0.985 0.004 60)`) and deep espresso typography (`oklch(0.18 0.02 30)`) to avoid sterile, generic blue SaaS fatigue.
- **Multi-Theme & High-Contrast Support**: Built-in support for `coral` (default), `slate` (cool corporate), and `contrast` (WCAG AAA high-contrast) themes across both Light and Dark modes (`src/styles/themes/`).
- **Tabular Precision for Financial & Time Data**: Every currency amount (VND), attendance timestamp, tax deduction, and ID badge uses `font-variant-numeric: tabular-nums` (`font-mono`) so columns align to the pixel.

---

## 2. Design Tokens (`src/styles/theme.css` & `src/styles/themes/coral.css`)

### 2.1 Semantic Color Tokens (`oklch`)

| Token | Light Mode (`coral.css`) | Dark Mode (`coral.css`) | Usage |
| --- | --- | --- | --- |
| `--background` | `oklch(0.985 0.004 60)` | `oklch(0.14 0.01 30)` | Primary page canvas |
| `--foreground` | `oklch(0.18 0.02 30)` | `oklch(0.95 0.01 60)` | Primary body & heading text |
| `--card` | `oklch(1 0 0)` | `oklch(0.19 0.015 30)` | Elevated cards, tables, and sheets |
| `--primary` | `oklch(0.55 0.16 25)` | `oklch(0.65 0.16 25)` | Primary CTA buttons, active indicators, focus rings |
| `--secondary` | `oklch(0.94 0.015 50)` | `oklch(0.25 0.02 30)` | Secondary buttons, subtle pills |
| `--muted-foreground` | `oklch(0.42 0.02 30)` | `oklch(0.68 0.015 50)` | Secondary labels, table headers, captions (WCAG AA compliant $\ge 4.5:1$) |
| `--destructive` | `oklch(0.52 0.2 25)` | `oklch(0.62 0.2 25)` | Reject/revoke/delete actions & validation errors |
| `--success` | `oklch(0.58 0.15 150)` | `oklch(0.68 0.15 150)` | Approved/Active/Paid status badges & positive trends |
| `--warning` | `oklch(0.72 0.15 75)` | `oklch(0.78 0.15 75)` | Pending/Probation/Provisional badges & caution alerts |
| `--info` | `oklch(0.55 0.14 235)` | `oklch(0.68 0.14 235)` | Informational callouts, in-progress states |
| `--border` | `oklch(0.9 0.01 50)` | `oklch(0.28 0.015 30)` | Hairline dividers, table borders, input outlines |

### 2.2 Typography Scale
- **Sans Font (`--font-sans`)**: `Be Vietnam Pro` / `Inter` / system UI — optimized for Vietnamese diacritics (`ắ, ặ, ẫ, ệ, ơ, ư, đ`).
- **Mono Font (`--font-mono`)**: `JetBrains Mono` — used for employee codes (`EMP-001`), SKUs, monetary values, and timestamps.
- **Scale**:
  - Page Title: `text-lg font-semibold tracking-tight` (`18px`)
  - Section / Card Title: `text-base font-semibold` (`16px`)
  - Body / Table Cell: `text-sm` (`14px`, line-height `1.5`)
  - Metadata / Badge / Caption: `text-xs font-medium` (`12px`)

### 2.3 Spacing, Radius & Elevation
- **Radius (`--radius: 0.625rem` / `10px`)**:
  - Cards & Dialogs: `rounded-xl` (`14px`)
  - Buttons & Inputs: `rounded-md` (`8px`)
  - Status Badges: `rounded-full` or `rounded-md`
- **Layout Grid & Density**:
  - Domain viewports use `flex min-h-0 flex-1 flex-col gap-4 p-4 md:px-6`.
  - Bento grids use `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`.

---

## 3. Standardized Component Library (`src/components/ui/` & `src/components/layout/`)

| Component Category | Canonical Components | Behavioral & Accessibility Standards |
| --- | --- | --- |
| **Navigation & Layout** | `AppSidebar`, `Header`, `DomainHeader`, `Section` | Keyboard navigable (`Tab`, arrow keys), active route aria-current, horizontal scroll on mobile domain tabs |
| **Buttons & Actions** | `Button` (`default`, `secondary`, `outline`, `ghost`, `destructive`), `DropdownMenu` | Disabled state during `isPending` mutations; icon-only buttons require `aria-label` or `sr-only` text |
| **Forms & Pickers** | `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Label`, `Form` | Every input paired with `<Label>` or `aria-label`; entity references (Department, Employee, Requisition, Asset Type) use `<Select>` dropdowns rather than raw UUID inputs |
| **Data Presentation** | `Table`, `DataTable`, `Card`, `Badge`, `StatusBadge`, `Avatar` | Skeleton rows during `isLoading`; explicit empty state message when `rows.length === 0`; error banner with retry button on query failure |
| **Overlays & Feedback** | `Dialog`, `Sheet` (Quick-Peek), `AlertDialog`, `Sonner` (`toast`) | Focus trap inside open dialogs/sheets; `Escape` closes safely; destructive actions confirm intent; mutations trigger `toast.success` / `toast.error` |
