import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { companyStatusEnum, locationTypeEnum } from "./enums";

// 4. Companies
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    taxCode: text("tax_code"),
    registrationNumber: text("registration_number"),
    currency: text("currency").default("VND").notNull(),
    timezone: text("timezone").default("Asia/Ho_Chi_Minh").notNull(),
    status: companyStatusEnum("status").default("active").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxStatus: index("idx_companies_status").on(table.status),
  }),
);

// 4a. Branches
export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    parentBranchId: uuid("parent_branch_id"),
    address: text("address"),
    phoneNumber: text("phone_number"),
    email: text("email"),
    isHeadquarters: boolean("is_headquarters").default(false).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqCompanyCode: unique("uq_branches_company_code").on(
      table.companyId,
      table.code,
    ),
    idxCompanyId: index("idx_branches_company_id").on(table.companyId),
    idxParent: index("idx_branches_parent_id").on(table.parentBranchId),
  }),
);

// 4b. Locations
export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    parentId: uuid("parent_id").references((): any => locations.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: locationTypeEnum("type").notNull(),
    address: text("address"),
    timezone: text("timezone"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    radiusMeters: integer("radius_meters"),
    allowedIpCidrs: jsonb("allowed_ip_cidrs"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxBranch: index("idx_locations_branch_id").on(table.branchId),
    idxParent: index("idx_locations_parent_id").on(table.parentId),
    idxType: index("idx_locations_type").on(table.type),
    uqCode: unique("uq_locations_code").on(table.code),
  }),
);

// 5. Departments
export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),


    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),

    code: text("code"),

    name: text("name").notNull(),

    description: text("description"),

    costCenterCode: text("cost_center_code"),
    businessUnitId: uuid("business_unit_id"),
    defaultCostCenterId: uuid("default_cost_center_id"),

    parentId: uuid("parent_id").references((): any => departments.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxBranch: index("idx_departments_branch_id").on(table.branchId),
    idxParent: index("idx_departments_parent_id").on(table.parentId),
    uqCompanyCode: uniqueIndex("uq_departments_company_code")
      .on(table.code)
      .where(sql`${table.code} is not null`),
  }),
);

export const businessUnits = pgTable("business_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique(),
  headPositionId: uuid("head_position_id"), // Added later in relations to avoid circular
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  idxHeadPosition: index("idx_business_units_head_position_id").on(table.headPositionId),
}));

export const costCenters = pgTable("cost_centers", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  budgetOwnerPositionId: uuid("budget_owner_position_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  idxBudgetOwner: index("idx_cost_centers_budget_owner_position_id").on(table.budgetOwnerPositionId),
}));
