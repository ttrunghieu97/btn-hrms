# Visual Foundations — Coral HRMS

## 1. Design Direction: Warm Modern-Minimal
Coral HRMS uses a warm modern-minimal aesthetic designed for dense, data-heavy enterprise workflows. The anchor hue is `30` (warm coral / amber-terracotta in `oklch`), paired with neutral warm paper backgrounds and deep ink typography.

### Principles
- **Clarity over ornament**: Flat surfaces with subtle warm borders (`--border-1`) instead of heavy dropshadows or noisy gradients.
- **Data-first density**: Monospace numbers for instant vertical scanning, 40-44px table rows, compact pill badges.
- **Warm ergonomics**: Softer than cold sterile enterprise greys; warm tinted backgrounds reduce eye fatigue across 8-hour operational work shifts.
- **No industry clichés**: No purple gradients, no emoji-as-feature-cards, no rounded cards with left accent bars.

---

## 2. Color Roles & Palette Semantics

### Paper & Ink (Surfaces & Typography)
- `--bg-1` (`oklch(0.985 0.006 30)`): Page canvas background. A very pale, warm parchment tint.
- `--bg-2` (`oklch(0.995 0.004 30)`): Card & elevated surface background. Near pure warm white.
- `--bg-3` (`oklch(0.93 0.008 30)`): Secondary containers, hover fills, interactive control backgrounds.
- `--bg-inset` (`oklch(0.96 0.005 30)`): Inset filter toolbars, table headers, disabled wells.
- `--fg-1` (`oklch(0.18 0.014 28)`): Primary ink. Deep warm charcoal, high contrast WCAG AAA compliant.
- `--fg-2` (`oklch(0.52 0.012 30)`): Secondary ink for subtext, metadata labels, and helper descriptions.
- `--fg-3` (`oklch(0.62 0.012 30)`): Muted tertiary ink for placeholders, inactive tabs, and hints.

### Brand & Interactive Accent
- `--accent-1` (`oklch(0.58 0.175 28)`): Primary coral signal. Used for primary CTAs, active states, key links, and keyboard focus rings.
- `--accent-1-hover` (`oklch(0.53 0.175 28)`): Darkened coral for interactive hover and focus states.
- `--accent-2` (`oklch(0.88 0.04 28)`): Soft tinted coral for text selection, badge highlights, and secondary active items.

### Status Semantics (Pills & Chips)
Every status color maintains balanced perceptual lightness (`L ≈ 0.60–0.75`) with 10–15% opacity tinted backgrounds:
- **Success (`--status-ok`)**: `oklch(0.60 0.17 145)` on `--status-ok-bg` `oklch(0.96 0.04 150)`. For full attendance, approved state.
- **Warning (`--status-warn`)**: `oklch(0.72 0.16 75)` on `--status-warn-bg` `oklch(0.965 0.045 80)`. For incomplete punch, late, pending.
- **Critical / Danger (`--status-bad`)**: `oklch(0.55 0.22 24)` on `--status-bad-bg` `oklch(0.965 0.04 24)`. For absent, unauthorized, rejected.
- **Information (`--status-info`)**: `oklch(0.60 0.14 240)` on `--status-info-bg` `oklch(0.955 0.03 250)`. For holiday, OT, informational tags.

### Calendar Row Tints
- `--sun-bg` (`oklch(0.972 0.02 40)`): Subtle warm amber row tint for Sunday.
- `--sat-bg` (`oklch(0.965 0.005 30)`): Neutral muted row tint for Saturday.

---

## 3. Typography Scale & Hierarchy

| Role | Font Family | Size | Line Height | Weight | Application |
|---|---|---|---|---|---|
| **Display Title** | `Instrument Serif` | `1.75rem` (28px) | `1.25` | 400 | Page headline or month banner |
| **Section Heading (H1)** | `Geist Sans` | `1.5rem` (24px) | `1.3` | 600 | Major section / view header |
| **Card / Modal Title (H2)** | `Geist Sans` | `1.125rem` (18px) | `1.35` | 600 | Card headers, modal titles |
| **Group Header (H3)** | `Geist Sans` | `0.9375rem` (15px) | `1.4` | 600 | Subsections, form group labels |
| **Body (Default)** | `Geist Sans` | `0.875rem` (14px) | `1.5` | 400/500 | Standard UI, table cells, form labels |
| **Small / Caption** | `Geist Sans` | `0.75rem` (12px) | `1.4` | 500 | Helper text, secondary timestamps |
| **Mono Numerical (Sm)** | `Geist Mono` | `0.75rem` (12px) | `1.5` | 500 | Employee IDs, badges, micro metrics |
| **Mono Numerical (Md)** | `Geist Mono` | `0.875rem` (14px) | `1.5` | 500/600 | Table times (`08:30`), hours (`8.0h`) |
| **Mono Metric (Lg)** | `Geist Mono` | `1.25rem` (20px) | `1.2` | 700 | Stat card big numbers (`98.5%`, `42`) |

---

## 4. Spacing & Layout Rhythm

- **Base Unit**: `4px` (0.25rem).
- **Page Layout**:
  - Global container padding: `clamp(1rem, 2vw, 2rem)` (16px to 32px).
  - Sidebar fixed width: `240px` (standard) / `64px` (collapsed).
  - Main view area: Flex stretch with horizontal scroll isolation for wide tables.
- **Card Padding**: `1.25rem` (20px) or `1.5rem` (24px).
- **Dense Table Dimensions**:
  - Row height: `42px` to `46px`.
  - Cell padding: `0.5rem 0.75rem` (8px top/bottom, 12px left/right).
- **Control Sizing**:
  - Small control (dense): `32px` (`h-8`).
  - Standard control: `36px` (`h-9`).
  - Large button: `40px` (`h-10`).

---

## 5. Elevation, Borders & Radii

### Radii
- Base radius: `0.5rem` (8px).
- Small elements (checkboxes, tags, pills): `0.25rem` (4px) to `0.375rem` (6px).
- Full rounded (status badges, avatars): `9999px`.

### Borders
- Default border: `1px solid var(--border-1)` (`oklch(0.88 0.006 30)`).
- Table dividers: `1px solid var(--border-1)`.
- Input focused: `1px solid var(--ring)` with `3px` focus ring glow (`oklch(0.58 0.175 28 / 0.25)`).

### Shadows
Warm-tinted with hue `28–30°`:
- `--shadow-xs`: Micro lift for interactive buttons and pills.
- `--shadow-sm`: Standard card elevation.
- `--shadow-md`: Dropdown menus, popovers, hover states.
- `--shadow-lg`: Slide-over drawers, modal dialogs.

---

## 6. Motion & Interactive States

- **Durations**:
  - Hover & background transition: `120ms – 150ms ease-out`.
  - Drawer slide & modal fade: `200ms cubic-bezier(0.16, 1, 0.3, 1)`.
- **States**:
  - **Hover**: Subtle contrast increase (primary button shifts from `--accent-1` to `--accent-1-hover`; table row gets `bg-muted/50`).
  - **Active / Press**: `transform: scale(0.98)` on buttons.
  - **Focus**: `outline: none; box-shadow: 0 0 0 3px oklch(0.58 0.175 28 / 0.25)`.

---

## 7. Iconography & Asset Guidelines

- **Icon Set**: Tabler Icons (`@tabler/icons-react`).
- **Style**: Line icons, 2px or 1.5px stroke width, rounded caps and joins.
- **Sizes**:
  - Inline with text: `14px` – `16px`.
  - Icon-only button: `18px` – `20px`.
  - Empty state / hero icon: `32px` – `40px`.
- **Brand Logo**:
  - Location: `assets/logos/logo-vang.png`.
  - Usage: Displayed at top left of sidebar with company name "BTN HRMS" and legal subtitle "Bach Thao Ngan".
