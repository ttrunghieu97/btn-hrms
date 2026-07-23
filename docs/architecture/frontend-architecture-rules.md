# Frontend Architecture Rules

> Status: L3 (Enforced)
> Tooling: ESLint (`eslint.arch.config.mjs`) + dependency-cruiser (`.dependency-cruiser.cjs`)

## Rule #1 — Feature Isolation

Features must not import internal modules of other features.

```tsx
// ✅ Correct
import { NotificationCenter } from '@/features/notifications';

// ❌ Wrong — importing internal path
import { NotificationCenter } from '@/features/notifications/components/notification-center';
```

Enforced by: `dependency-cruiser` — `feature-boundary-violation` rule

## Rule #2 — Platform Dependency Direction

Platform/shared layer must not depend on features.

```
components/platform/  →  ❌  features/
lib/                  →  ❌  features/
```

Enforced by: `dependency-cruiser` — `shared-purity` rule

## Rule #3 — App Layer Restrictions

Pages/routes must only import from feature public API facades.

```tsx
// ✅ Correct
import { DashboardPage } from '@/features/dashboard';

// ❌ Wrong — importing internal path
import { DashboardPage } from '@/features/dashboard/components/widget-dashboard';
```

Enforced by: ESLint — `src/app/**` restricted imports

## Rule #4 — Barrel Export

Feature `index.ts` must use explicit exports, not `export *`.

```ts
// ✅ Correct
export { FeatureA } from './components/feature-a';

// ❌ Wrong
export * from './components/feature-a';
```

Enforced by: ESLint — `features/*/index.ts` rule

## Rule #5 — Data Layer Separation

Components must not call API directly. Use feature queries/hooks.

```
Components → useQuery/useMutation → generated API
❌ Component → customFetch/fetch directly
```

Enforced by: ESLint — feature component restricted imports

## Running

```bash
# Full FE architecture check
pnpm --filter frontend arch:check

# Combined API + FE check (from root)
pnpm arch:check

# Full validation (lint + arch)
pnpm check
```

## CI Integration

```yaml
# PR gate
- run: pnpm --filter @project/api arch:check
- run: pnpm --filter frontend arch:check
```
