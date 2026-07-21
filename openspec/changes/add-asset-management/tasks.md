# Implementation Tasks

## 1. Schema & Module Scaffold

- [x] 1.1 Create `schema/asset-management` group; relocate `asset_types`, `assets`, `asset_assignments`, `asset_status_enum` (and their relations) out of the `onboarding` group
- [x] 1.2 Add new tables: `asset_issues` + `asset_issue_items` (issue aggregate + lines), `asset_history` (append-only lifecycle log, `chk quantity`), `asset_stock_levels` (projection + reorder threshold), `asset_requests`, `asset_request_items`; add `asset_request_status_enum` and `asset_history_kind_enum`
- [x] 1.3 **Drop** `employee_equipment_handovers` + `employee_equipment_handover_items` tables and their relations from the `workforce` schema
- [x] 1.4 Update `schema/index.ts` exports; run `pnpm --filter @project/api db:push` and confirm `schema-integrity.spec.ts` passes with no unexpected destructive diff
- [x] 1.5 Scaffold `apps/api/src/modules/asset-management` with sub-modules `catalog`, `inventory`, `request`, `issue`, `history`, plus shared `domain/events`
- [x] 1.6 Create `AssetManagementModule` and register it in the app root module
- [x] 1.7 Register asset domain actions/permissions (`asset:type.manage`, `asset:request.create`, `asset:request.approve`, `asset:issue`, `asset:return`, `asset:read`) in the auth policy system
- [x] 1.8 Add `asset-management` to the domain list in `AGENTS.md`

## 2. Catalog (asset-catalog)

- [x] 2.1 DTOs + mapper for asset type and asset
- [x] 2.2 Repository (create/list/update asset types; register/list/update assets)
- [x] 2.3 Manage-asset-type use-cases (create/edit/retire, unique code, `isTrackable` flag)
- [x] 2.4 Register-serialized-asset use-case (unique code, start `available`, append `created` history)
- [x] 2.5 Asset-status use-case (`available`/`maintenance`; block issue when `retired`/`lost`; append history)
- [x] 2.6 Controller with one auth decorator per endpoint + Swagger
- [x] 2.7 Unit tests for duplicate-code rejection and status guards

## 3. Inventory (asset-inventory)

- [x] 3.1 DTOs + mapper for stock-level projection
- [x] 3.2 Repository (read projection; recompute-from-history reconciliation query)
- [x] 3.3 Receive-stock use-case (append `received` history, update projection in same tx)
- [x] 3.4 Stock-adjust use-case (append `adjust` history, never negative — enforce via check + guard)
- [x] 3.5 Low-stock signal when issue crosses reorder threshold → `platform-notifications`
- [x] 3.6 Controller + Swagger + auth
- [x] 3.7 Unit tests for non-negative guard, projection-reconciles-to-log, and threshold notification

## 4. Request (asset-request)

- [x] 4.1 DTOs + mapper for request and request items
- [x] 4.2 Repository (create, get, list, update-status, mark items fulfilled)
- [x] 4.3 Create-request use-case (≥ 1 item, quantity ≥ 1, start `draft`)
- [x] 4.4 Edit-request use-case (allowed only in `draft`)
- [x] 4.5 Submit-for-approval use-case (create approval request, set `pending_approval`)
- [x] 4.6 Cancel-request use-case (withdraw open approval; terminal `cancelled`/`rejected`)
- [x] 4.7 Controller + Swagger + auth
- [x] 4.8 Unit tests for validation, edit guard, and status transitions

## 5. Issue (asset-issue)

- [x] 5.1 DTOs + mapper for the `AssetIssue` aggregate (issue + item lines + attachments + issuer/receiver)
- [x] 5.2 Repository (create issue + lines; close/return lines; current-holder query derived from open lines)
- [x] 5.3 Issue-asset use-case — single tx: create `AssetIssue`(+items), update holding-state/stock projection, append `issued` history, mark request item fulfilled (if `requestId`), optionally finalize a signed-handover attachment, stage `asset.assigned` event; nullable `requestId` supports direct issue
- [x] 5.4 Availability guards (reject retired/lost serialized; reject beyond available stock) applied to both request-based and direct issue
- [x] 5.5 Return-asset use-case — single tx: close issue line + condition, restore holding/stock, append `returned` history, stage `asset.returned` event; support partial-quantity return
- [x] 5.6 Assignment mutations happen only through issue-lifecycle use-cases (no direct assignment edit endpoint)
- [x] 5.7 Controller + Swagger + auth (`asset:issue`, `asset:return`)
- [x] 5.8 Unit tests for aggregate integrity, tx atomicity, availability guards, direct-issue null request, and outbox staging

## 6. History (asset-history)

- [x] 6.1 DTO + mapper for history entries
- [x] 6.2 Repository (append-only insert helper used by all lifecycle use-cases; ordered read by asset)
- [x] 6.3 `GET /assets/:id/history` endpoint (chronological lifecycle log) + Swagger + auth (`asset:read`)
- [x] 6.4 Ensure holdings + stock are computed/reconciled from history; no direct-mutation path exists
- [x] 6.5 Unit tests for append-only invariant and history-driven reconstruction

## 7. Approval Integration (asset-approval)

- [x] 7.1 Create `src/integration/asset-approval` mirroring `leave-approval`
- [x] 7.2 Approval policy resolver for the asset-request subject
- [x] 7.3 Decision handler service updating request status from engine decisions + notifying requester
- [x] 7.4 Inbox/trace wiring + listener/gateway
- [x] 7.5 Integration module registered and tested

## 8. Domain Events & Cross-context Contract (asset-holdings)

- [x] 8.1 Define `asset.assigned` / `asset.returned` events with minimal item snapshot (asset/issue IDs, name, serial, quantity)
- [x] 8.2 Stage events in the outbox inside the issue/return transaction; publish via `EventOutboxDispatcherService`
- [x] 8.3 Define `AssetHoldingsReaderPort` + `AssetHoldingDto` read model in `src/contracts/ports` + token in `contracts.tokens.ts` (returns read model, never an entity); holdings computed from open issue lines
- [x] 8.4 Asset-management subscriber for `employee.terminated`: flag open issue lines for return + notify admin (idempotent via `EventIdempotencyRepository`)

## 9. Remove Legacy Workforce Handover Feature

- [x] 9.1 Delete backend: `EmployeeEquipmentRepository`, `UpsertEmployeeEquipmentHandoverUseCase` (+spec), `upsert-employee-equipment-handover.dto`, the `PUT /employees/:id/equipment-handover` controller endpoint + imports, and the provider/export entries in `employees.module.ts`
- [x] 9.2 Remove the `equipmentHandovers` field from `employee-response.dto` and the `handovers`/`equipmentHandovers` relation from `employee-query-builder.ts`; drop the `equipment_handover` mapping in `employee.mapper` (+update specs)
- [x] 9.3 Remove frontend: `employee-equipment-handover-section` (+spec), its use in `overview-tab`/`employee-detail-view`, and the handover branch in `use-employee-form`
- [x] 9.4 Wire the `AssetHoldingsReaderPort` adapter so employee detail renders current holdings (`AssetHoldingDto`) from the asset context
- [x] 9.5 Confirm no dangling references remain (`grep -ri equipment-handover` clean outside generated client, which is regenerated in §10)

## 10. Frontend

- [ ] 10.1 Run `pnpm client:generate` to regenerate the API client
- [ ] 10.2 Create `apps/web/src/features/asset-management` (queries/service/components) following existing feature conventions and the shared layout blueprint
- [ ] 10.3 Add `app/(protected)/assets` routes + layout (canonical `h1` + `DomainTabs`)
- [ ] 10.4 Build views: catalog (types + assets), inventory/stock, requests list/detail, issue + current-holdings, and per-asset history timeline (from `GET /assets/:id/history`)
- [ ] 10.5 Verify the generated client no longer contains equipment-handover types after regeneration

## 11. Verification

- [ ] 11.1 `pnpm --filter @project/api arch:check` passes (no cross-context repo imports; modules registered)
- [ ] 11.2 `pnpm --filter @project/api test` for asset use-cases, subscriber, and integration
- [ ] 11.3 `pnpm client:verify` and web `typecheck`
- [ ] 11.4 `pnpm lint` and `pnpm build`
- [ ] 11.5 Manual smoke: receive stock → request → approve → issue (both request-based and direct) → attach signed handover → verify holdings on employee detail + history timeline → return → verify stock restored + history appended → terminate employee → verify open holdings flagged
