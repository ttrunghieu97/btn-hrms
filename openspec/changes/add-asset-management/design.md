## Context

The company issues equipment/supplies to employees but has no system of record. Two overlapping pieces already exist: the `asset_types`/`assets`/`asset_assignments` tables (with relations, in the `onboarding` schema group) are **declared-but-unbuilt** — no module wires them; and `employee_equipment_handovers` (+items) in `workforce` is a **running** feature that stores signed handover *documents* only (free-text items, attached PDF via storage, no catalog/inventory/approval). Because the project is pre-production (dev stage) with no data to preserve, this change builds a first-class `asset-management` context on the existing asset tables, adds the missing request/approval and quantity-inventory pieces, and **removes the legacy workforce handover feature outright** — no bridge, no dual system. The handover document becomes an attachment of an issuance.

The repo is single-tenant, dev-stage, NestJS + Drizzle + PostgreSQL, with strict Controller → UseCase → Repository → Mapper layering and pragmatic DDD boundaries (`AGENTS.md`). Mature platforms exist: `platform-approval-engine`, `platform-notifications`, `storage`. Cross-context communication goes through `src/contracts` ports and domain events via the outbox, never foreign repositories. Working precedents: `src/integration/leave-approval` (approval-engine wiring) and `leave/subscribers/employee-lifecycle.subscriber.ts` (event consumer with `EventIdempotencyRepository`).

## Goals / Non-Goals

**Goals:**
- Stand up `asset-management` as the sole owner of asset catalog, inventory, requests, and issuance/return, reusing the existing `asset_*` tables.
- Support both serialized (per-unit, serial) and quantity-tracked (consumable stock) assets via `asset_types.isTrackable`.
- Route asset requests through `platform-approval-engine` mirroring `leave-approval`; also support direct issuance (no request) on management order.
- Track the current holder and support return/reclaim, with an append-only inventory transaction log.
- Emit `asset.assigned`/`asset.returned` outbound events for the termination-return hook and notifications; expose current holdings to workforce/offboarding only through an `AssetHoldingsReaderPort`.
- Remove the legacy `employee_equipment_handovers` feature (tables, module, UI) cleanly — the handover document becomes an attachment of an issuance in the asset context.

**Non-Goals:**
- Asset maintenance scheduling, depreciation, and financial accounting (status `maintenance` exists but no maintenance workflow).
- External procurement / purchase-order integration.
- Barcode/RFID scanning hardware integration.
- Multi-tenant abstractions (single-tenant per `AGENTS.md`).
- Data migration of legacy `employee_equipment_handovers` rows — pre-production, so tables are dropped, not migrated.

## Decisions

**1. New bounded context `apps/api/src/modules/asset-management`, sole owner of the `asset_*` tables.**
Per `AGENTS.md` ("one context owns each aggregate and its write rules"), asset-management owns catalog/inventory/request/issue/history. Rationale: keeps asset write rules out of `workforce` and `onboarding`. Alternative (extend `workforce/employees`) rejected — it would overload the largest feature and blur ownership.

**2. Schema ownership moves out of the `onboarding` group into an `asset-management` schema group; add the missing tables.**
Relocate `asset_types`/`assets`/`asset_assignments`/`asset_status_enum` export into `schema/asset-management` and ADD: `asset_issues` + `asset_issue_items` (the issue aggregate + lines), `asset_history` (append-only lifecycle log), `asset_stock_levels` (projection with reorder threshold), `asset_requests`, `asset_request_items`, plus `asset_request_status_enum` and `asset_history_kind_enum`. Applied via `db:push` (dev default). Rationale: the existing tables are a good serialized-asset skeleton; the issue aggregate, history log, quantity projection, and requests are genuinely new. Alternative (leave tables under onboarding) rejected — ownership must match the owning context.

**3. Sub-module split inside the context, one per capability.**
`catalog` (types + serialized assets), `inventory` (stock projection), `request` (request lifecycle), `issue` (the `AssetIssue` aggregate: issue/return/holder), `history` (lifecycle log + query), each with controller/use-cases/repositories/mappers/dto, plus a shared `domain/events`. Rationale: matches the capability specs and mirrors the `workforce`/proposed-`recruitment` internal layout.

**4. Reuse `platform-approval-engine` via `src/integration/asset-approval`.**
Asset-request approval routes through the engine using a policy resolver + decision handler, exactly like `leave-approval` (`approval-inbox`, `*-approval-policy.resolver`, `*-decision.handler.service`, listener/gateway). Rationale: proven pattern, no new approval infra. Alternative (bespoke approval columns on `asset_requests`) rejected — duplicates the engine's audit trail.

**5. `AssetIssue` is the aggregate root; assignment and stock are derived, not the record.**
A hand-out is one `AssetIssue` transaction owning its item lines, attachments (signed handover), issuer/receiver, optional `requestId`, and lifecycle events — analogous to an `Invoice`, not an `InvoiceStatus`. `asset_assignments` holds only the current holding *state* of a line; `asset_stock_levels` is a cached projection. Both derive from the issue lifecycle recorded in `asset_history`. Rationale: makes the business transaction the unit of record and keeps custody/state auditable and reconstructable. Alternative (treat assignment as the primary record) rejected — it loses transaction context (who issued, approval, attachments) and invites direct-state mutation.

**6. Issue/return are single-transaction use-cases that write the aggregate + history + projections + outbound event together.**
Inside one `repo.transaction(tx)`: write/close the `asset_issue`(_items), update the `asset_assignments` holding state and/or `asset_stock_levels` projection, append `asset_history`, and `EventOutboxService.stage(event, tx)`. `EventOutboxDispatcherService` publishes `asset.assigned`/`asset.returned` after commit. Rationale: projections must never diverge from the history log; the outbox guarantees at-least-once cross-context delivery. Alternative (emit before commit / synchronous call into workforce) rejected — violates the outbox rule.

**7. `asset_history` is the authoritative log; holdings and stock are projections.**
Every lifecycle action appends an immutable `asset_history` row (created/received/reserved/issued/returned/transferred/maintenance/disposed). **Asset Holdings is a read model derived from the issuance lifecycle and MUST NOT become an aggregate or independently mutable state**; stock levels are likewise a projection, reconcilable by recomputation from the log. No operation mutates holdings directly. Rationale: single source of truth, trivial audit (`GET /assets/:id/history`), no reverse-sync. Alternative (mutable holdings/stock as source of truth) rejected — it reintroduces the drift problem this design exists to avoid.

**8. Remove the legacy workforce handover feature; the handover document becomes an attachment of an `AssetIssue`.**
Delete `employee_equipment_handovers`/`employee_equipment_handover_items` (tables, relations, `EmployeeEquipmentRepository`, `UpsertEmployeeEquipmentHandoverUseCase`, DTOs, the `PUT /employees/:id/equipment-handover` endpoint, the `equipmentHandovers` response field, and the query-builder `handovers` relation), plus the frontend section/components/hook. A signed handover is uploaded against the issue (temp-upload → finalize after commit). Rationale: pre-production, no data to preserve, so a bridge/derived-record scheme is unnecessary; one owner, no duplication. Alternative (keep workforce table as a derived record fed by events) rejected — perpetuates two asset stores for no dev-stage benefit.

**9. Cross-context reads via an `AssetHoldingsReaderPort` returning a read model.**
Workforce employee-detail and offboarding read "who holds what" through `AssetHoldingsReaderPort` in `src/contracts/ports` (token in `contracts.tokens.ts`), which returns an `AssetHoldingDto` read model (`assetId`, `assetTag`, `assetTypeName`, `serialNumber`, `issuedAt`, `expectedReturnAt`, `status`) — never an `Asset`/`AssetIssue`/assignment entity. On `employee.terminated`, an asset-management subscriber flags open issue lines for return (idempotent via `EventIdempotencyRepository`). Rationale: consumers stay ignorant of the asset domain model; the port is a stable contract.

**10. Direct issue is the same use-case with a null request reference.**
`IssueAssetUseCase` accepts an optional `requestId`; direct (management-order) issue passes null and is gated by a distinct policy (`asset:issue`). Rationale: one issue path, one history/projection/event flow, avoids divergence. The approved-request branch additionally marks request items fulfilled.

**11. Auth: one policy/permission per action.**
`asset:type.manage`, `asset:request.create`, `asset:request.approve`, `asset:issue`, `asset:return`, `asset:read` — each endpoint gets exactly one `@RequirePolicy`/`@RequirePermission`, no stacked decorators. Registered in the auth/policy layer.

**12. Attachments reuse temp-upload → finalize.**
Any issue/handover evidence follows `StorageService.finalizeUpload()` after DB commit, as in `employee-documents`. No new storage abstraction.

## Risks / Trade-offs

- **Projection drift (holdings/stock vs. history)** → `asset_history` is the append-only source of truth; holdings and stock are projections updated in the same transaction and reconcilable by recomputation from the log. A `quantity >= 0` check plus a recompute reconciliation guards drift. No API mutates holdings/stock directly.
- **Removing a running feature (handover) touches API + UI** → Pre-production, so acceptable; enumerate every reference (controller endpoint, DTO field, query-builder relation, module providers, frontend section/hook/test) in tasks and remove together, then regenerate the client so no dangling generated types remain.
- **Schema group relocation touches `onboarding` exports** → The `asset_*` tables are unbuilt (no module reads them), so moving the export is low-risk; the dropped handover tables are the only destructive change and carry no data at this stage.
- **Two issuance triggers (request vs direct) on one path** → Distinct policies and a nullable `requestId` keep audit unambiguous; the approved-request branch is the only one that touches request-item fulfilment.
- **arch:check violations from cross-context access** → Route all workforce/offboarding interaction through `src/contracts`; run `pnpm --filter @project/api arch:check` before finishing.

## Migration Plan

1. Create `schema/asset-management` group: move `asset_types`/`assets`/`asset_assignments`/`asset_status_enum` there; add `asset_issues`, `asset_issue_items`, `asset_history`, `asset_stock_levels`, `asset_requests`, `asset_request_items`, and the new enums. **Drop** `employee_equipment_handovers`/`employee_equipment_handover_items` and their relations. `pnpm --filter @project/api db:push`; verify `schema-integrity.spec.ts`.
2. Build `asset-management` sub-modules (catalog, inventory, requests, issuance); register `AssetManagementModule` in the app root.
3. Add `src/integration/asset-approval` wiring to the approval engine (resolver + decision handler + inbox/trace).
4. Add `asset.assigned`/`asset.returned` domain events + outbox staging; add `AssetHoldingsReaderPort` contract + token.
5. Remove the legacy workforce handover feature: repository, use-case, DTOs, controller endpoint, `equipmentHandovers` response field, query-builder relation, and module providers; add the asset-management subscriber for `employee.terminated`.
6. Regenerate the web client (`pnpm client:generate`); build `apps/web/src/features/asset-management` + `app/(protected)/assets` routes; remove the employee equipment-handover section/components/hook/test.
7. Add `asset-management` to the `AGENTS.md` domain list.
8. Verify: `arch:check`, API tests, `client:verify`, typecheck.

Rollback: asset-management is additive except the handover removal. Since the project is pre-production with no data, rollback means unregistering the modules, dropping the new tables, and reverting the handover deletion from version control — no data-recovery concern.

## Open Questions

- Should quantity-tracked assignments track individual return of partial quantities, or return-in-full only, in v1? (Proposed: support partial return via quantity delta on the transaction log.)
- Reorder threshold per type only, or per type+location once locations exist? (Proposed: per type in v1; no location dimension yet.)
- Should the issuance-attachment (signed handover) be mandatory for serialized high-value assets, or always optional in v1? (Proposed: optional in v1; a per-type "requires signed handover" flag can come later.)
