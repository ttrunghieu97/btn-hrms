# Thiết kế ngắn: Xử lý triệt để lỗi IDE Project Diagnostics chuẩn Enterprise (2026-10-23)

## 1. Mục đích & Lý do (Intent & Why)
Loại bỏ hoàn toàn tình trạng lệch kết quả kiểm tra giữa CLI (`pnpm check` / `tsrs`) và Zed IDE (**Project Diagnostics** báo hàng loạt lỗi), đồng thời đưa toàn bộ file test (`*.spec.ts`, `*.spec.tsx`, `test/e2e/**`) vào phạm vi kiểm soát kiểu dữ liệu chính thức để ngăn chặn triệt để tình trạng trôi kiểu (type drift) về sau.

## 2. Mục tiêu & Phi mục tiêu (Goals, Non-goals, Anti-goals)
- **Mục tiêu:**
  1. Đưa toàn bộ file test của `apps/web` và `apps/api` vào phạm vi quản lý của `tsconfig.json` để `vtsls` (`tsserver`) trên IDE và `tsrs` / `tsc` dưới CLI đồng bộ 100%, không còn file mồ côi (*Inferred Project*).
  2. Cấu hình [`.zed/settings.json`](file:///home/hieutt/btn-hrms/.zed/settings.json) chuẩn monorepo: tắt `vscode-eslint` thừa (vì dự án dùng `oxlint`), trỏ `vtsls` (`tsdk`) về đúng TypeScript của workspace, và cấu hình `tailwindcss-language-server` tắt cảnh báo gợi ý `"suggestCanonicalClasses": "ignore"` (giữ nguyên độ rộng `px` cố định của bảng và các rule bắt lỗi thật của Tailwind).
  3. Sửa dứt điểm toàn bộ **42 lỗi type thật** đang tồn tại trong dự án (26 lỗi ở `apps/web` test, 13 lỗi ở `apps/api/test/e2e`, và 3 lỗi ở [`employee-queries.ts`](file:///home/hieutt/btn-hrms/apps/web/src/features/employees/queries/employee-queries.ts) + [`upload-policy.ts`](file:///home/hieutt/btn-hrms/apps/api/src/shared/upload/upload-policy.ts)) theo chuẩn type-safe (không lạm dụng `any` để lách lỗi).
- **Phi mục tiêu:** Không thay đổi logic nghiệp vụ runtime, không thay đổi schema DB hay API contract.
- **Anti-goals:** Không đưa các file test (`*.spec.*`, `test/`) vào gói build production (`dist/` của `@project/api` hoặc `.next/` của `frontend`); không dùng `@ts-ignore` / `@ts-expect-error` bừa bãi để che giấu lỗi thật.

## 3. Ràng buộc (Constraints)
- Tuân thủ nghiêm ngặt quy tắc trong [`AGENTS.md`](file:///home/hieutt/btn-hrms/AGENTS.md): không thêm dependency mới, không sửa file sinh tự động (`src/api/generated/`, `src/lib/generated/`).
- Đảm bảo 0 lỗi trên cả 3 trình kiểm tra: `pnpm check` (`oxlint`, `arch:check`, `tsrs --noEmit`), `tsc --noEmit` (TypeScript 6.0.3 của workspace), và `vtsls` (TypeScript 5.9.3 của Zed IDE), đồng thời toàn bộ unit test của các file liên quan đều pass.

## 4. Phương án kỹ thuật (Approaches)
- **Phương án 1 (Đã chọn):** Mở rộng trực tiếp [`apps/web/tsconfig.json`](file:///home/hieutt/btn-hrms/apps/web/tsconfig.json) và [`apps/api/tsconfig.json`](file:///home/hieutt/btn-hrms/apps/api/tsconfig.json) để bao phủ luôn các file test (trong khi giữ nguyên `exclude` test tại [`apps/api/tsconfig.build.json`](file:///home/hieutt/btn-hrms/apps/api/tsconfig.build.json) cho bước build production), kết hợp chuẩn hóa [`.zed/settings.json`](file:///home/hieutt/btn-hrms/.zed/settings.json) và sửa toàn bộ 42 lỗi type.
- **Phương án 2 (Đã loại):** Tách thêm các file `tsconfig.spec.json` riêng kèm Project References — sinh thêm file cấu hình dư thừa và buộc phải sửa script CLI để chạy kiểm tra 2 lần ở mỗi package.

## 5. Chi tiết triển khai đã thống nhất (Decided How)
- **Cấu hình TypeScript & IDE:**
  - [`apps/web/tsconfig.json`](file:///home/hieutt/btn-hrms/apps/web/tsconfig.json): Bỏ `**/__tests__/**`, `**/*.spec.*`, `**/*.test.*` khỏi mảng `exclude` (chỉ giữ `"exclude": ["node_modules"]`).
  - [`apps/api/tsconfig.json`](file:///home/hieutt/btn-hrms/apps/api/tsconfig.json) & [`apps/api/tsconfig.build.json`](file:///home/hieutt/btn-hrms/apps/api/tsconfig.build.json): Chuyển `"rootDir": "./src"` vào `tsconfig.build.json`; ở `tsconfig.json` cập nhật `"include": ["src/**/*", "test/**/*.ts", "drizzle.config.ts"]` và `"exclude": ["node_modules", "dist"]`.
  - [`.zed/settings.json`](file:///home/hieutt/btn-hrms/.zed/settings.json): Vô hiệu hóa language server `eslint` cho các ngôn ngữ TypeScript/TSX/JavaScript, cấu hình `lsp.vtsls.settings.typescript.tsdk` trỏ về `apps/web/node_modules/typescript/lib`, và cấu hình `lsp.tailwindcss-language-server.settings.tailwindCSS.lint.suggestCanonicalClasses: "ignore"`.
- **Sửa 3 lỗi ở source code chính (tương thích cả TS 5.9 / 6.0 / `tsrs`):**
  - [`apps/web/src/features/employees/queries/employee-queries.ts`](file:///home/hieutt/btn-hrms/apps/web/src/features/employees/queries/employee-queries.ts): Định kiểu rõ ràng giá trị trả về của `mutationFn` cho `scheduleTermination` và `cancelTermination` khớp với `ScheduleTerminationResponse` và `{ success: boolean }`.
  - [`apps/api/src/shared/upload/upload-policy.ts`](file:///home/hieutt/btn-hrms/apps/api/src/shared/upload/upload-policy.ts): Xử lý kiểu dynamic import `file-type` tương thích chuẩn `module: commonjs` mà không phụ thuộc vào `moduleResolution: bundler`.
- **Sửa 26 lỗi type trong test của `apps/web`:**
  - [`detail-sheet.spec.ts`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/timesheet-editor/components/detail-sheet.spec.ts) & [`timesheet-benchmark.spec.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/timesheet-editor/components/timesheet-benchmark.spec.tsx): Bổ sung đầy đủ các trường bắt buộc của `TimesheetWorkspaceRecord` và `TimesheetWorkspaceEmployee`, truyền đủ tham số cho `computeMonthStats`.
  - [`attendance-queries.spec.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/queries/attendance-queries.spec.tsx): Cập nhật giá trị enum/union từ `'MORNING'` / `'CHECK_IN'` sang `'morning'` / `'checkin'` theo đúng OpenAPI contract hiện hành.
  - [`lifecycle.spec.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/leave/api/lifecycle.spec.tsx) & [`mutations.spec.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/leave/api/mutations.spec.tsx): Cập nhật payload `CreateLeaveRequestDto` (`startSession`, `endSession`, `totalUnits`) và biến mutation `LeaveManagementControllerCancelMutationVariables` (`{ id }` thay vì `{ id, data }`).
  - [`board-intent.spec.ts`](file:///home/hieutt/btn-hrms/apps/web/src/features/tasks/components/board/__tests__/board-intent.spec.ts) & [`board-validation.spec.ts`](file:///home/hieutt/btn-hrms/apps/web/src/features/tasks/components/board/__tests__/board-validation.spec.ts): Dùng ép kiểu có chủ đích (`'bogus' as unknown as TaskItem['status']`) cho các test case kiểm thử dữ liệu bất hợp lệ từ runtime và bổ sung đầy đủ trường cho fixture `TaskAssignee`, bỏ key `status` bị trùng lặp.
  - [`user-form-sheet.spec.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/users/components/user-form-sheet.spec.tsx): Chuẩn hóa fixture khớp với `UserResponseDto`.
- **Sửa 13 lỗi type trong `apps/api/test/e2e`:**
  - [`test-app.ts`](file:///home/hieutt/btn-hrms/apps/api/test/e2e/helpers/test-app.ts), [`attendance.e2e-spec.ts`](file:///home/hieutt/btn-hrms/apps/api/test/e2e/attendance.e2e-spec.ts), [`authorization.e2e-spec.ts`](file:///home/hieutt/btn-hrms/apps/api/test/e2e/authorization.e2e-spec.ts), [`employee-lifecycle.e2e-spec.ts`](file:///home/hieutt/btn-hrms/apps/api/test/e2e/employee-lifecycle.e2e-spec.ts), [`leave.e2e-spec.ts`](file:///home/hieutt/btn-hrms/apps/api/test/e2e/leave.e2e-spec.ts), [`auth.e2e-spec.ts`](file:///home/hieutt/btn-hrms/apps/api/test/e2e/auth.e2e-spec.ts): Định kiểu đúng cho `db` instance (`DrizzleDatabase` thay vì suy luận nhầm sang module `schema`) và kiểm tra/ép kiểu header `Cookie` an toàn trong `auth.e2e-spec.ts`.
