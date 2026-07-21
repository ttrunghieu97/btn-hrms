import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  date,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";
import {
  assetStatusEnum,
  assetRequestStatusEnum,
  assetIssueLineStatusEnum,
  assetHistoryKindEnum,
} from "./enums";

/**
 * Asset type — a catalog category (e.g. "Laptop", "Monitor").
 * `isTrackable` distinguishes serialized units (tracked individually) from
 * consumables managed purely by stock quantity.
 */
export const assetTypes = pgTable(
  "asset_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    description: text("description"),
    isTrackable: boolean("is_trackable").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    uqCode: uniqueIndex("uq_asset_types_code").on(t.code),
  }),
);

/**
 * Asset — a serialized unit belonging to an asset type. Its `status` reflects
 * the current lifecycle state; holdings are derived from issue lines, not this
 * column, which is a denormalized convenience mirror.
 */
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetTypeId: uuid("asset_type_id")
      .notNull()
      .references(() => assetTypes.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    serialNumber: varchar("serial_number", { length: 255 }),
    status: assetStatusEnum("status").default("available").notNull(),
    purchaseDate: date("purchase_date"),
    purchaseCost: numeric("purchase_cost", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    idxAssetType: index("idx_assets_asset_type").on(t.assetTypeId),
    idxStatus: index("idx_assets_status").on(t.status),
    uqCode: uniqueIndex("uq_assets_code").on(t.code),
  }),
);

/**
 * Stock level — the on-hand and reserved quantities per asset type.
 * A projection maintained transactionally alongside history entries;
 * `lowStockThreshold` drives the low-stock signal.
 */
export const assetStockLevels = pgTable(
  "asset_stock_levels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetTypeId: uuid("asset_type_id")
      .notNull()
      .references(() => assetTypes.id, { onDelete: "cascade" }),
    onHand: integer("on_hand").default(0).notNull(),
    reserved: integer("reserved").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uqAssetType: uniqueIndex("uq_asset_stock_levels_asset_type").on(
      t.assetTypeId,
    ),
    chkOnHand: check("chk_asset_stock_levels_on_hand", sql`${t.onHand} >= 0`),
    chkReserved: check(
      "chk_asset_stock_levels_reserved",
      sql`${t.reserved} >= 0`,
    ),
  }),
);

/**
 * Asset request — an employee's order for one or more asset types, subject to
 * approval. Lifecycle: draft → pending_approval → approved → fulfilled,
 * with rejected / cancelled terminal branches.
 */
export const assetRequests = pgTable(
  "asset_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterEmployeeId: uuid("requester_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    status: assetRequestStatusEnum("status").notNull().default("draft"),
    reason: text("reason"),
    neededBy: date("needed_by"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
    decisionNote: text("decision_note"),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    idxRequester: index("idx_asset_requests_requester").on(
      t.requesterEmployeeId,
    ),
    idxStatus: index("idx_asset_requests_status").on(t.status),
  }),
);

/**
 * Asset request line — a requested asset type and quantity within a request.
 */
export const assetRequestLines = pgTable(
  "asset_request_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => assetRequests.id, { onDelete: "cascade" }),
    assetTypeId: uuid("asset_type_id")
      .notNull()
      .references(() => assetTypes.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxRequest: index("idx_asset_request_lines_request").on(t.requestId),
    idxAssetType: index("idx_asset_request_lines_asset_type").on(t.assetTypeId),
    chkQuantity: check(
      "chk_asset_request_lines_quantity",
      sql`${t.quantity} > 0`,
    ),
  }),
);

/**
 * Asset issue — a physical handover of assets to an employee, optionally
 * originating from an approved request. The successor to the removed
 * equipment-handover feature.
 */
export const assetIssues = pgTable(
  "asset_issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    requestId: uuid("request_id").references(() => assetRequests.id, {
      onDelete: "set null",
    }),
    issuedByUserId: uuid("issued_by_user_id").references(() => users.id),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    idxEmployee: index("idx_asset_issues_employee").on(t.employeeId),
    idxRequest: index("idx_asset_issues_request").on(t.requestId),
  }),
);

/**
 * Asset issue line — a single asset unit (or quantity of a consumable) within
 * an issue. `status` tracks whether the holding is still open or returned;
 * this is the authoritative source for who-holds-what projections.
 */
export const assetIssueLines = pgTable(
  "asset_issue_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => assetIssues.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "restrict",
    }),
    assetTypeId: uuid("asset_type_id")
      .notNull()
      .references(() => assetTypes.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    status: assetIssueLineStatusEnum("status").notNull().default("open"),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    returnedToUserId: uuid("returned_to_user_id").references(() => users.id),
    condition: text("condition"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxIssue: index("idx_asset_issue_lines_issue").on(t.issueId),
    idxAsset: index("idx_asset_issue_lines_asset").on(t.assetId),
    idxAssetType: index("idx_asset_issue_lines_asset_type").on(t.assetTypeId),
    idxStatus: index("idx_asset_issue_lines_status").on(t.status),
    chkQuantity: check("chk_asset_issue_lines_quantity", sql`${t.quantity} > 0`),
  }),
);

/**
 * Asset history — an append-only ledger of every lifecycle event for an asset
 * or asset type. This is the authoritative log; holdings, stock levels, and
 * the per-asset status column are all projections derived from these rows.
 */
export const assetHistoryEntries = pgTable(
  "asset_history_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: assetHistoryKindEnum("kind").notNull(),
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    assetTypeId: uuid("asset_type_id").references(() => assetTypes.id, {
      onDelete: "set null",
    }),
    issueId: uuid("issue_id").references(() => assetIssues.id, {
      onDelete: "set null",
    }),
    issueLineId: uuid("issue_line_id").references(() => assetIssueLines.id, {
      onDelete: "set null",
    }),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    quantityDelta: integer("quantity_delta"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxAsset: index("idx_asset_history_entries_asset").on(t.assetId),
    idxAssetType: index("idx_asset_history_entries_asset_type").on(
      t.assetTypeId,
    ),
    idxEmployee: index("idx_asset_history_entries_employee").on(t.employeeId),
    idxOccurredAt: index("idx_asset_history_entries_occurred_at").on(
      t.occurredAt,
    ),
  }),
);
