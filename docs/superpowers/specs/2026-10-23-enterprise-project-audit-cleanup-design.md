# Thiết kế Chuẩn hóa Cấu trúc Monorepo & Dọn dẹp Triệt để (Enterprise YAGNI Audit)

- **Ngày**: 2026-10-23
- **Trạng thái**: Draft (Chờ duyệt)
- **Phạm vi**: Toàn bộ monorepo `btn-hrms` (Root, `scripts/`, `apps/api`, `apps/web`, `packages/`)

---

## 1. Mục đích & Lý do (Intent & Why)

Trong quá trình phát triển qua nhiều giai đoạn, monorepo `btn-hrms` đã tích tụ:

1. Các file artifact sinh nhầm vị trí (`openapi.json` bị trùng ở 3 nơi), script cá nhân chứa đường dẫn máy local (`parse_xlsx.js`, `start.sh`, `idle-watchdog.sh`), dữ liệu báo cáo mẫu `.docx`, và thư mục dump `.playwright-mcp/`.
2. Các lệnh `scripts` trong `package.json` bị trùng lặp ngữ nghĩa (`dev` vs `start:dev`, `lint` vs `lint:check`, `test` vs `test:unit`, `depcruise` vs `lint:arch`).
3. Các source file, UI primitive (`shadcn/ui`), module dự phòng (`shared/workflow`, `components/platform/search`, `dashboard-intelligence`), và test helper (`src/test/msw/*`) không được nối vào luồng chạy thực tế (dead code hoặc chỉ được gọi bởi unit test của chính nó).
4. Các thư viện NPM trong `package.json` không còn bất kỳ file nào trong dự án sử dụng (`kafkajs`, `@nestjs/bullmq`, `msw`, `ioredis` ở frontend...).

Bản thiết kế này giải quyết triệt để theo nguyên tắc **YAGNI (You Aren't Gonna Need It)** và thiết lập **Automated Governance Gate** trong `pnpm check` để ngăn chặn file mồ côi tái xuất hiện.

---

## 2. Mục tiêu, Phi mục tiêu & Chống mục tiêu (Goals, Non-goals, Anti-goals)

### Mục tiêu (Goals)

- **Xóa triệt để 100% file rác, dead code và module dự phòng chỉ có trong unit test** trên toàn bộ `root`, `scripts/`, `apps/api` và `apps/web`.
- **Chuẩn hóa hệ thống script** trong `package.json` theo nguyên tắc "1 lệnh - 1 mục đích", không hardcode đường dẫn máy cá nhân.
- **Gỡ bỏ toàn bộ NPM dependencies dư thừa** không còn được import và đồng bộ lại `pnpm-lock.yaml`.
- **Tích hợp cổng kiểm tra tự động (Orphan/Dead-file Gate)** vào `apps/web/.dependency-cruiser.cjs` và `apps/api/scripts/check-arch-all.mjs` để `pnpm arch:check` tự động chặn file mồ côi trong tương lai.
- Đảm bảo toàn bộ cổng chất lượng (`pnpm lint`, `pnpm arch:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`) chạy xanh (`PASS`).

### Phi mục tiêu (Non-goals)

- Không thay đổi schema cơ sở dữ liệu (`apps/api/src/infrastructure/database/schema/**`) hay các file migration trong `apps/api/drizzle/**`.
- Không thay đổi hợp đồng API (OpenAPI endpoints/DTO đang phục vụ runtime) hoặc chỉnh sửa thủ công thư mục sinh tự động `apps/web/src/api/generated/**`.
- Không viết lại logic nghiệp vụ của các tính năng đang hoạt động.

### Chống mục tiêu (Anti-goals)

- **Không làm mất hoặc hỏng các thay đổi đang làm dở (uncommitted changes) trên working tree** (như cụm `attendance/timesheet-editor`, `auth`, `cookie-csrf.util.ts`, `env.server.ts`, `admin/layout.tsx`).
- Không giữ lại code "để dành cho tương lai" dưới dạng dead barrel export.
- Không làm gãy quy trình CI/CD, Docker build (`apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose*.yml`) hoặc các script vận hành production trong `scripts/deployment/`.

---

## 3. Ràng buộc kỹ thuật (Constraints)

1. **An toàn Working Tree**: Trước khi xóa bất kỳ file nào, phải đối chiếu `git status` để không đụng vào các file mới đang phát triển trong đợt sửa lỗi hiện tại (ví dụ: `apps/api/src/shared/utils/cookie-csrf.util.ts`, `apps/web/src/lib/env.server.ts`, `apps/web/src/features/attendance/timesheet-editor/components/timesheet-print-all-view.tsx` đang được import bởi các file vừa sửa).
2. **Bảo toàn Governance & Runbook**:
   - Các script trong `scripts/deployment/` (`backup-postgres.mjs`, `restore-postgres.mjs`, `restore-postgres.test.mjs`, `backup-minio.mjs`, `check-env.mjs`, `smoke-check.mjs`, `init-multiple-dbs.sh`) và `scripts/security/check-tracked-secrets.mjs` đang được dùng bởi `pnpm check:all`, `docker-compose.infra.yml` và tài liệu vận hành `docs/runbooks/deployment-migration-and-recovery.md` -> **Giữ nguyên**.
   - `apps/web/src/shared/authorization/route-registry/routes.ts` đang được đọc trực tiếp bởi `apps/web/scripts/validate-authorization.mjs` và `apps/web/src/proxy.ts` -> **Giữ nguyên**.
3. **Thứ tự kiểm chứng bắt buộc**: Sau khi dọn dẹp và cập nhật `pnpm-lock.yaml`, chạy tuần tự:
   `pnpm lint` → `pnpm --filter @project/api arch:check` → `pnpm --filter frontend typecheck` → `pnpm --filter frontend depcruise` → `pnpm --filter frontend authorization:check` → `pnpm test` → `pnpm build`.

---

## 4. Các hướng tiếp cận đã cân nhắc (Approaches)

1. **Hướng 1: Dọn dẹp 4 lớp (Repo, Scripts, API, Web) — Giữ nguyên `dependencies` & `pnpm-lock.yaml`**
   - _Đánh đổi_: Không chạm vào `pnpm-lock.yaml`, nhưng để lại hàng chục package thừa trong `package.json` và `node_modules`.
2. **Hướng 2: Dọn dẹp 4 lớp + Gỡ bỏ toàn bộ NPM Dependencies dư thừa**
   - _Đánh đổi_: Làm sạch cả source code lẫn `package.json` / `pnpm-lock.yaml`, nhưng nếu sau này phát sinh file mồ côi mới thì không có công cụ tự động phát hiện.
3. **Hướng 3 (Đã chọn): Hướng 2 + Gắn thêm Gate tự động chặn file mồ côi trong `arch:check`**
   - _Lý do chọn_: Giải quyết tận gốc cả phần dọn dẹp hiện tại (file rác, script thừa, dead code, test-only modules, unused dependencies) lẫn phần phòng ngừa tự động theo chuẩn enterprise thông qua `depcruise` (Web) và `arch:check` (API).

---

## 5. Thiết kế chi tiết (Detailed Specification)

### 5.1. Lớp 1: Dọn dẹp Artifact, Config mồ côi & File rác cấp Repo

#### Các file/thư mục xóa bỏ:

- **OpenAPI trùng lặp**:
  - `apps/api/apps/web/openapi.json` (và xóa thư mục rỗng `apps/api/apps/`)
  - `apps/api/openapi.json`
    _(Chỉ giữ lại nguồn chuẩn duy nhất tại `apps/web/openapi.json`)_
- **Script & file cá nhân / ad-hoc**:
  - `apps/api/parse_xlsx.js` (script cá nhân hardcode `/home/hieutt/hieutt@sẻrver1/employee.xlsx`)
  - `apps/api/start.sh` (vòng lặp `while true` ghi log ra `/tmp/api-loop.log`)
  - `scripts/dev/idle-watchdog.sh` (script cron cá nhân hardcode `/home/hieutt/btn-hrms`)
  - `apps/api/src/infrastructure/database/check-encoding.sql`
  - `apps/api/storage/reports/BÁO CÁO TÌNH HÌNH SD LAO ĐỘNG 2026.docx` (và thư mục `apps/api/storage/` nếu rỗng)
  - `.playwright-mcp/` (thư mục chứa ảnh chụp và log debug cục bộ)
  - `apps/web/test-results/` (thư mục kết quả test cục bộ)
- **Config mồ côi**:
  - `apps/api/knip.json` (không cài `knip`, thay bằng gate chính thức trong `arch:check`)
  - `apps/api/skills-lock.json`
  - `apps/web/skills-lock.json`
  - `apps/web/.vercelignore` (dự án triển khai qua Docker/Caddy, không dùng Vercel)
  - Xác nhận trạng thái xóa của file `"AUTONOMOUS PHASE 8.md"` ở root.

#### Cập nhật `.gitignore`:

- Bổ sung `apps/api/storage/` và `apps/api/openapi.json` vào `.gitignore` để không bao giờ commit nhầm file runtime/generated.

---

### 5.2. Lớp 2: Chuẩn hóa `package.json` Scripts

#### Root `package.json`:

- **Xóa**:
  - `lint:check` (trùng hoàn toàn với `lint`: `"oxlint"`)
  - `deploy:vps` và `deploy:vps:build` (đang hardcode `cd /home/hieutt/btn-hrms` qua SSH cá nhân; việc triển khai thuộc về CI/CD hoặc runbook, không đặt đường dẫn cá nhân trong root `package.json`).

#### `apps/api/package.json`:

- **Xóa**:
  - `start:dev` (trùng hoàn toàn với `dev`)
  - `lint:check` (trùng hoàn toàn với `lint`, cập nhật script `check` gọi `pnpm lint` thay vì `pnpm lint:check`)
  - `test:unit` (trùng hoàn toàn với `test`)
  - `db:seed:xlsx` (đi kèm việc xóa `seed-xlsx.ts` bên dưới)

#### `apps/web/package.json`:

- **Xóa**:
  - `lint:arch` (trùng hoàn toàn với `depcruise`)
- **Dọn metadata**:
  - Xóa trường `"author": { "name": "Kiran", "url": "https://github.com/Kiranism" }` còn sót lại từ template boilerplate ban đầu.

---

### 5.3. Lớp 3: Dọn dẹp Dead Code & Test-Only Modules trong `apps/api`

#### 1. Các file nguồn xóa bỏ (kèm file `.spec.ts` tương ứng):

- **Events không có publisher/handler**:
  - `apps/api/src/core/events/events/certificate-expired.event.ts`
  - `apps/api/src/core/events/events/payroll-financial-publication-completed.event.ts`
  - `apps/api/src/modules/workforce/domain/events/department-moved.event.ts`
- **Seeds & helper chết**:
  - `apps/api/src/infrastructure/database/seed-employees.ts`
  - `apps/api/src/infrastructure/database/seed-xlsx.ts`
  - `apps/api/src/modules/onboarding/infrastructure/seeds/seed-onboarding-templates.ts`
  - `apps/api/src/modules/identity/auth/use-cases/auth-usecase-base.ts`
- **Các module/use-case/DTO chỉ tồn tại trong unit test (không nối vào runtime module/controller nào)**:
  - Cụm `apps/api/src/shared/workflow/` (toàn bộ 10 file: `workflow-definition.ts`, `workflow-engine-router.port.ts`, `workflow-engine-router.ts`, `workflow-engine-router.spec.ts`, `workflow-engine.ts`, `workflow-engine.spec.ts`, `workflow-guard.engine.ts`, `workflow-instance.model.ts`, `workflow-safety-guard.ts`, `workflow-safety-guard.spec.ts`)
  - `apps/api/src/shared/observability/structured-logger.ts` (và `apps/api/src/shared/logging/logger-redaction.spec.ts`, cập nhật `apps/api/src/shared/observability/observability.spec.ts` nếu chỉ test `StructuredLogger`)
  - `apps/api/src/shared/dto/base-query.dto.ts` (và cập nhật `apps/api/src/shared/dto/pagination.dto.spec.ts` để chỉ test `PaginationQueryDto` đang dùng thật)
  - `apps/api/src/modules/identity/access-control/domain/permission-code.ts` và `permission-code.spec.ts` (cập nhật `apps/api/src/core/security/permissions/permissions.registry.spec.ts` nếu có import hàm parse từ đây)
  - `apps/api/src/modules/identity/access-control/use-cases/get-effective-access.usecase.ts` và `get-effective-access.usecase.spec.ts`
  - `apps/api/src/modules/identity/permissions/dto/permission-query.dto.ts` và `permission-query.dto.spec.ts`
  - `apps/api/src/modules/organization/departments/use-cases/move-department-with-event.usecase.ts` (cùng `department-hierarchy.invariant.spec.ts` và `workforce-outbox-migration.spec.ts` vốn chỉ test class không được đăng ký trong NestJS module này)

#### 2. Cập nhật Governance Baseline (nếu có tham chiếu):

- Kiểm tra `apps/api/governance/arch-baseline.json` và `context-ownership.registry.json` để gỡ các đường dẫn file đã xóa (nếu được liệt kê).

---

### 5.4. Lớp 4: Dọn dẹp Dead Code, UI Primitives & Test-Only Modules trong `apps/web`

#### 1. Nhóm `shadcn/ui` primitives không sử dụng (`apps/web/src/components/ui/`):

Xóa 14 component không được bất kỳ file nào trong `apps/web/src` import:

- `accordion.tsx`
- `aspect-ratio.tsx`
- `collapsible.tsx`
- `context-menu.tsx`
- `drawer.tsx`
- `hover-card.tsx`
- `input-otp.tsx`
- `kbd.tsx`
- `menubar.tsx`
- `navigation-menu.tsx`
- `pagination.tsx`
- `resizable.tsx`
- `toggle.tsx`
- `toggle-group.tsx`

#### 2. Nhóm Platform & Shared Components không sử dụng:

- `apps/web/src/components/auth/permission-gate.tsx` và `permission-gate.spec.tsx`
- `apps/web/src/components/errors/unauthorized-card.tsx`, `unauthorized-dialog.tsx` và `apps/web/src/components/errors/__tests__/error-presentation.components.spec.ts`
- `apps/web/src/components/workflow/index.ts` (và các file bên trong `apps/web/src/components/workflow/` nếu không có nơi nào khác import)
- `apps/web/src/components/platform/dashboard-intelligence/` (toàn bộ thư mục: `attention-card.tsx`, `insight-card.tsx`, `trend-indicator.tsx`, `types.ts`, `index.ts`)
- `apps/web/src/components/platform/search/` (toàn bộ thư mục: `search-command.tsx`, `search-engine.ts`, `types.ts`, `index.ts`, `providers/*`, `__tests__/*`)
- `apps/web/src/components/platform/workflow-timeline/` (kiểm tra nếu không có trang nào dùng `WorkflowTimeline` / `WorkflowStatusBadge` thì xóa toàn bộ thư mục)
- `apps/web/src/components/platform/widget-registry.ts` và `apps/web/src/components/platform/__tests__/widget-registry.spec.ts` (trùng lặp với `features/dashboard/widget-registry/widget-registry.ts`)
- Cập nhật barrel `apps/web/src/components/platform/index.ts` chỉ giữ lại `ActivityTimeline`, `StatusCard`, `MetricCard`, `QuickActionCard`, `ActivityCenter`.

#### 3. Nhóm `shared/authorization` & `features/authorization` chỉ có trong test:

- Xóa `apps/web/src/shared/authorization/components/{ActionGuard,CanAccessRoute,ResourceGuard}.tsx` và `apps/web/src/shared/authorization/__tests__/components.adapter.spec.ts`.
- Xóa `apps/web/src/shared/authorization/services/authorization.service.ts` và `apps/web/src/shared/authorization/__tests__/authorization.service.spec.ts` (cùng `resolvers/`, `registry/authorization.registry.ts`, `constants/{actions,resources,routes}.ts` nếu chúng chỉ phục vụ `authorization.service.ts` và `ActionGuard`/`ResourceGuard`; giữ nguyên `route-registry/routes.ts`, `permissions/permissions.ts` và các hàm `canAccessRoute`, `isPublicRoute`, `PUBLIC_ROUTES` đang dùng thật).
- Xóa `apps/web/src/features/authorization/guards/route-access.ts` và `apps/web/src/features/authorization/__tests__/route-access.spec.ts`, cập nhật `apps/web/src/features/authorization/index.ts`.

#### 4. Nhóm Feature Components / Views / Hooks chết:

- `apps/web/src/features/attendance/components/presence-columns.tsx`
- `apps/web/src/features/attendance/components/presence-management.tsx`
- `apps/web/src/features/attendance/my-attendance/my-attendance-view.tsx` (và gỡ khỏi `apps/web/src/features/attendance/index.ts`)
- `apps/web/src/features/attendance/timesheet-editor/utils.ts`
- `apps/web/src/features/dashboard/widgets/compliance-status-card.tsx`
- `apps/web/src/features/dashboard/widgets/team-attendance-card.tsx`
- `apps/web/src/features/dashboard/widgets/team-leave-card.tsx`
- `apps/web/src/features/payroll/components/payroll-nav.tsx`
- `apps/web/src/features/schedule/api/queries.ts`
- `apps/web/src/features/settings/components/config-card.tsx`
- `apps/web/src/features/uploads/hooks/use-temp-upload-field.ts` và `use-temp-upload-field.spec.ts` (cập nhật `apps/web/src/features/uploads/index.ts` và gỡ `jest.mock` dư trong `employee-create-page.spec.tsx`)
- `apps/web/src/features/workspace/api/index.ts` (và các file bên trong `features/workspace/api/` nếu không dùng)
- `apps/web/src/features/workspace/components/`: xóa 6 component chết (`admin-quick-actions.tsx`, `admin-security-overview.tsx`, `admin-system-health.tsx`, `quick-actions.tsx`, `today-status.tsx`, `workspace-header.tsx`) và gỡ khỏi `apps/web/src/features/workspace/index.ts`.
- `apps/web/src/locales/vicommit /public-pages.ts`

#### 5. Nhóm Test Helpers & Factories không sử dụng (`apps/web/src/test/`):

- Xóa toàn bộ thư mục `apps/web/src/test/msw/` (`server.ts`, `test-server.ts`, `handlers/*.ts`).
- Xóa `apps/web/src/test/utils/render-with-providers.tsx`.
- Xóa 5 factory không dùng trong `apps/web/src/test/factories/`: `benefits.factory.ts`, `leave.factory.ts`, `offboarding.factory.ts`, `onboarding.factory.ts`, `performance.factory.ts` (giữ lại `attendance.factory.ts`, `employee.factory.ts`, `payroll.factory.ts` đang được spec import).

---

### 5.5. Lớp 5: Gỡ bỏ NPM Dependencies dư thừa & Đồng bộ Lockfile

Sau khi xóa các file ở Lớp 3 và Lớp 4, tiến hành kiểm tra lại toàn bộ import thực tế và gỡ bỏ các dependency không còn bất kỳ nơi nào sử dụng:

- **Trong `apps/api/package.json`**:
  - Gỡ khỏi `dependencies`: `@nestjs/bullmq`, `cache-manager-ioredis-yet`, `kafkajs`. (Lưu ý: giữ nguyên `@nestjs/platform-socket.io` nếu NestJS WebSockets gateway cần adapter runtime, hoặc kiểm tra kỹ trước khi gỡ).
- **Trong `apps/web/package.json`**:
  - Gỡ khỏi `dependencies`:
    - Hạ tầng đặt nhầm chỗ: `ioredis`, `dotenv`.
    - Các gói UI của những primitive đã xóa (sau khi xác nhận 0 import còn lại trong `apps/web/src`): `@radix-ui/react-accordion`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-toast`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `input-otp`, `react-resizable-panels`, `vaul`, `tailwindcss-animate`.
  - Gỡ khỏi `devDependencies`:
    - `msw` (do toàn bộ `src/test/msw/` đã xóa).
- Chạy `pnpm install` để cập nhật sạch sẽ `pnpm-lock.yaml`.

---

### 5.6. Lớp 6: Thiết lập Automated Governance Gate chặn File mồ côi

1. **Frontend (`apps/web/.dependency-cruiser.cjs`)**:
   - Bổ sung rule `no-orphans` (severity: `'error'`) vào mảng `forbidden` trong `apps/web/.dependency-cruiser.cjs`:
     - Phát hiện mọi file trong `src/` không có file nào phụ thuộc vào (`from: { orphan: true }`).
     - Loại trừ (`pathNot`) các entrypoint hợp lệ của Next.js và test:
       - `^src/app/.+/(page|layout|loading|error|not-found|global-error|route|template|default)\\.(ts|tsx)$`
       - `^src/app/(page|layout|loading|error|not-found|global-error)\\.(ts|tsx)$`
       - `^src/(instrumentation|proxy|middleware)\\.(ts|tsx)$`
       - `\\.d\\.ts$`
       - `\\.(spec|test)\\.(ts|tsx)$`
       - `^src/api/generated/`
2. **Backend (`apps/api/scripts/check-arch-all.mjs`)**:
   - Bổ sung bước kiểm tra `Orphan Files` (hoặc tích hợp trong script kiểm tra kiến trúc của `apps/api/scripts/`) để đảm bảo không có file `.ts` mồ côi nào ngoài các entrypoint hợp lệ (`src/main.ts`, `src/app/main.ts`, `src/scripts/*.ts`, `src/infrastructure/database/{seed,seed-roles,reset}.ts`, `src/infrastructure/database/schema/**`, `*.spec.ts`, `*.e2e-spec.ts`).

---

## 6. Phần để lại cho Builder quyết định (What's Left to the Builder)

- Trong quá trình xóa các barrel export ở `apps/web/src/components/platform/index.ts`, `apps/web/src/shared/authorization/index.ts` và `apps/web/src/features/workspace/index.ts`, Builder tự động truy vết tiếp các file con (types, sub-components, mappers, resolvers) nếu chúng chỉ được gọi bởi component vừa xóa và xóa cuốn chiếu toàn bộ cụm đó.
- Với các package như `@radix-ui/react-label`, `@radix-ui/react-separator` hoặc `sharp` trong `apps/web/package.json` (Next.js dùng `sharp` ngầm cho image optimization khi standalone build), Builder giữ lại `sharp` để đảm bảo hiệu năng Next.js image optimization trên Docker, và chỉ gỡ các package `@radix-ui/*` thực sự không còn import nào trong `src/`.
- Nếu một file `.spec.ts` kiểm thử chung nhiều hàm (ví dụ `pagination.dto.spec.ts` vừa test `BaseQueryDto` vừa test `PaginationQueryDto`), Builder chỉ xóa các khối `describe`/`it` liên quan đến class đã xóa (`BaseQueryDto`) và giữ lại phần test cho class đang chạy thật (`PaginationQueryDto`).
