# Font Assets & Typography Configuration — Coral HRMS

## Fonts Used
- **Primary UI Sans**: `Geist` (`--font-sans`)
  - Applied to: Body text, buttons, table headers, form inputs, tooltips, dialogs.
  - Weights: `400` (regular), `500` (medium), `600` (semibold), `700` (bold).
  - Source: Google Fonts (`family=Geist:wght@400;500;600;700`) & `next/font/google`.

- **Technical / Data Mono**: `Geist Mono` (`--font-mono`)
  - Applied to: Time inputs (`08:30`, `17:30`), durations (`8.0h`), employee codes (`NV0042`), period slugs (`2026-08`), timestamps, metrics.
  - Weights: `400` (regular), `500` (medium), `600` (semibold).
  - Rule: All table numbers, time calculations, and identifiers must use mono for tabular numeric alignment.
  - Source: Google Fonts (`family=Geist+Mono:wght@400;500;600`) & `next/font/google`.

- **Display Serif**: `Instrument Serif` (`--font-serif`)
  - Applied to: Page display headlines, brand serif accents, editorial moments.
  - Weight: `400` (regular & italic).
  - Rule: Reserved for prominent hero or page headlines; do not use inside dense tables or forms.
  - Source: Google Fonts (`family=Instrument+Serif:ital@0;1`) & `next/font/google`.

## Web & Prototype Embedding
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
```
