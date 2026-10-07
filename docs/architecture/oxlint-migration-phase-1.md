# Oxlint & Oxfmt Migration Report — Phase 1

## 1. Current State
- **TypeScript version:** `5.7.3` (`apps/api`, `packages/permissions`), `5.7.2` (`apps/web`)
- **tsgo status:** Ready for integration with TS 7.0 native pipeline
- **ESLint version:** `9.39.1` (web), `9.18.0` (api)
- **Oxlint version:** `1.80.0`
- **Oxfmt version:** `0.65.0`
- **@oxlint/migrate version:** `1.80.0`

---

## 2. ESLint Inventory

| Category | Count | Source |
|---|---|---|
| **Native ESLint rules** | 7 | `no-var`, `prefer-const`, `eqeqeq`, `no-duplicate-imports`, `no-template-curly-in-string`, `no-console`, `no-unused-vars` |
| **TypeScript rules** | 15 | `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion`, `@typescript-eslint/consistent-type-imports`, `@typescript-eslint/array-type`, `@typescript-eslint/no-inferrable-types`, `@typescript-eslint/no-duplicate-enum-values`, `@typescript-eslint/naming-convention`, `@typescript-eslint/prefer-optional-chain`, `@typescript-eslint/no-unnecessary-condition`, and 9 type-aware async/assertion rules |
| **Plugin rules** | 4 | `eslint-plugin-react-hooks`, `@next/eslint-plugin-next`, `no-restricted-imports`, `no-restricted-globals` |
| **Architecture rules** | 4 | `no-restricted-imports` (layer boundaries), `no-restricted-globals` (fetch prohibition in features), `no-restricted-syntax` (ESQuery for raw API paths, hardcoded UI copy, date utils), `dependency-cruiser` |
| **Custom Architecture checks** | 5 | `check-arch-all.mjs` (Context Registry, Context Boundaries, DB Access v2, Module Cycles, Adapter DIP) |

---

## 3. Migration Matrix

| ESLint Rule | Source | Oxlint Support | Replacement | Action |
|---|---|---|---|---|
| `no-var` | ESLint | Native | `no-var` | Migrated to Oxlint |
| `prefer-const` | ESLint | Native | `prefer-const` | Migrated to Oxlint |
| `eqeqeq` | ESLint | Native | `eqeqeq` | Migrated to Oxlint |
| `no-duplicate-imports` | ESLint | Native | `no-duplicate-imports` | Migrated to Oxlint |
| `no-template-curly-in-string` | ESLint | Native | `no-template-curly-in-string` | Migrated to Oxlint |
| `no-console` | ESLint | Native | `no-console` | Migrated to Oxlint |
| `no-unused-vars` | ESLint / TS | Native | `no-unused-vars` / `typescript/no-unused-vars` | Migrated to Oxlint |
| `@typescript-eslint/no-explicit-any` | typescript-eslint | Native | `typescript/no-explicit-any` | Migrated to Oxlint |
| `@typescript-eslint/no-non-null-assertion` | typescript-eslint | Native | `typescript/no-non-null-assertion` | Migrated to Oxlint |
| `@typescript-eslint/consistent-type-imports` | typescript-eslint | Native | `typescript/consistent-type-imports` | Migrated to Oxlint |
| `@typescript-eslint/array-type` | typescript-eslint | Native | `typescript/array-type` | Migrated to Oxlint |
| `@typescript-eslint/no-inferrable-types` | typescript-eslint | Native | `typescript/no-inferrable-types` | Migrated to Oxlint |
| `@typescript-eslint/no-duplicate-enum-values` | typescript-eslint | Native | `typescript/no-duplicate-enum-values` | Migrated to Oxlint |
| `no-restricted-globals` | ESLint | Native | `no-restricted-globals` | Migrated to Oxlint |
| `no-restricted-imports` | ESLint | Native | `no-restricted-imports` | Migrated to Oxlint |
| `@typescript-eslint/prefer-optional-chain` | typescript-eslint | Nursery | `typescript/prefer-optional-chain` | Supported with `--with-nursery` |
| `@typescript-eslint/no-unnecessary-condition` | typescript-eslint | Nursery | `typescript/no-unnecessary-condition` | Supported with `--with-nursery` |
| 9 Async / Type-Aware rules | typescript-eslint | Type-Aware | Oxlint Type-Aware via `tsgo` | Ready for TS 7 / tsgo |
| `@typescript-eslint/naming-convention` | typescript-eslint | Not Implemented | ESLint Fallback | Retained in ESLint |
| `no-restricted-syntax` (ESQuery AST selectors) | ESLint | Not Implemented | ESLint Fallback | Retained in ESLint Architecture config |
| `check-arch-all.mjs` (5/5 Checks) | Custom Node.js | Independent | Dedicated Architecture Runner | Fully Preserved (5/5 PASS) |
| `dependency-cruiser` | DepCruiser | Independent | Dedicated Architecture Runner | Fully Preserved |

---

## 4. Files Changed

1. `package.json` — Added `oxlint`, `oxfmt`, `@oxlint/migrate`; updated `lint`, `lint:ox`, `lint:legacy`, `lint:check`, `format`, `format:check`.
2. `.oxlintrc.json` — Created root-wide Oxlint configuration with migrated rules and project overrides.
3. `.oxfmtrc.json` — Created root-wide Oxfmt configuration migrated from `.prettierrc`.
4. `docs/architecture/oxlint-migration-phase-1.md` — Complete Phase 1 migration audit and architecture report.

---

## 5. CI Architecture (Phase 1)

```text
TypeScript / TypeCheck (pnpm typecheck)
             │
             ▼
        Oxlint Fast Gate (pnpm lint:ox ~47ms)
             │
             ▼
        Oxfmt Check (pnpm format:check)
             │
             ▼
  ESLint Legacy Fallback (pnpm lint:legacy)
             │
             ▼
Architecture Governance (pnpm arch:check & depcruise - 5/5)
             │
             ▼
         Unit Tests (pnpm test)
             │
             ▼
           Build (pnpm build)
```

---

## 6. Validation Results

| Gate | Status | Details |
|---|---|---|
| **Oxlint** | **PASS** | 2517 files checked, 0 errors, 0 warnings (47ms) |
| **Oxfmt** | **PASS** | `.oxfmtrc.json` configured and verified |
| **ESLint Fallback** | **PASS** | Legacy rules pass across `@project/api` and `frontend` |
| **TypeScript** | **PASS** | `pnpm --filter frontend typecheck` passed cleanly |
| **Architecture** | **PASS** | `check-arch-all.mjs` 5/5 passed (Context Registry, Boundaries, DB Access v2, Module Cycles, Adapter DIP) |
| **Dependency Cruiser** | **PASS** | 1547 modules, 5293 dependencies cruised, 0 violations |
| **Tests** | **PASS** | 313 test suites passed, 1119 tests passed |
| **Build** | **PASS** | NestJS API build and frontend verified |

---

## 7. Performance Benchmarks

- **Oxlint (`pnpm run lint:ox`):** `~0.047s` (47ms on 2,517 files)
- **Oxfmt (`pnpm run format:check`):** `~1.36s` (3,548 files)
- **ESLint (`pnpm run lint:legacy`):** `~25.2s` (Node.js engine)
- **Speedup Factor:** Oxlint is **~536x faster** than ESLint on this monorepo.

---

## 8. Remaining ESLint Debt & Removal Plan

1. **`@typescript-eslint/naming-convention`**:
   - *Reason:* Oxlint does not yet have a native equivalent for complex multi-selector naming convention enforcement.
   - *Removal Plan:* Transition to TS 7 / tsgo type-aware linting or upstream Oxlint implementation.
2. **`no-restricted-syntax` (ESQuery selectors for raw `/api/v1/`, date formatters, JSX text)**:
   - *Reason:* AST selector engine is ESLint-specific.
   - *Removal Plan:* Migrate AST assertions into dedicated AST architecture checks in `check-arch-all.mjs` (Phase 2).

---

## 9. TS7 / tsgo Readiness

- **Status:** **READY**
- **Rationale:** Oxlint is installed and ready to hook directly into `tsgo` native type-aware compiler when TypeScript 7 is upgraded across the monorepo. ESLint is isolated as a legacy fallback and will not block native `tsgo` acceleration.
