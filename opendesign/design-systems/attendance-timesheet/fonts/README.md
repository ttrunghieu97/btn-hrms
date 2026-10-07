# Typography Foundations — shadcn/ui Minimal

The attendance workspace relies on two typefaces:

## 1. Primary UI Font: `Geist Sans`
- Used for headers, labels, buttons, dialog titles, and general UI text.
- Fallbacks: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- Weights:
  - `400` (Regular): Secondary text, descriptions, table body notes.
  - `500` (Medium): Interactive labels, table headers, breadcrumbs.
  - `600` (Semibold): Component headings, employee names, active states.
  - `700` (Bold): Main page titles and dialog titles.

## 2. Numerical & Tabular Font: `Geist Mono`
- Used for all dates (`2026-09-01`), timestamps (`08:00`), employee codes (`LV831202`), currency (`5.000.000 đ`), hours (`8.0h`), and counts.
- Fallbacks: `ui-monospace, "SFMono-Regular", Menlo, monospace`.
- Feature settings: `font-feature-settings: "tnum" on, "zero" on;` ensuring zero character-width wobble during data updates or column alignment.
