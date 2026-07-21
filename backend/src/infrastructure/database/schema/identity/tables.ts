import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  index,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  username: text("username").notNull().unique(),
  email: text("email").unique(),

  passwordHash: text("password_hash"),
  passwordResetTokenHash: text("password_reset_token_hash"),
  passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at", { withTimezone: true }),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),

  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

  /**
   * Incremented whenever authorization state changes: roles reassigned,
   * permissions changed, account disabled, sessions revoked, MFA enforced.
   * JwtAuthGuard rejects tokens whose authorizationVersion < this value.
   */
  authorizationVersion: integer("authorization_version").notNull().default(1),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── User Identities (OAuth/SSO linked accounts) ──────────────────────────

export const userIdentities = pgTable(
  "user_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerSub: text("provider_sub").notNull(),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerIdx: index("idx_user_identities_provider").on(table.providerSub),
    userIdx: index("idx_user_identities_user_id").on(table.userId),
    uniqueProviderPerUser: unique("uq_user_identities_provider_user").on(
      table.provider,
      table.userId,
    ),
  }),
);

// ─── Permissions ─────────────────────────────────────────────────────────────

export const permissions = pgTable("permissions", {
  code: text("code").primaryKey(),

  description: text("description"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── UserPermissions ─────────────────────────────────────────────────────────

export const userPermissions = pgTable(
  "user_permissions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),

    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    grantedBy: uuid("granted_by").references(() => users.id, {
      onDelete: "set null",
    }),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({
      name: "pk_user_permissions",
      columns: [table.userId, table.permissionCode],
    }),

    userIdx: index("idx_user_permissions_user_id").on(table.userId),
    permissionIdx: index("idx_user_permissions_permission_code").on(
      table.permissionCode,
    ),
  }),
);

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    clientIp: text("client_ip"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("refresh_tokens_user_idx").on(table.userId),
    tokenIdx: index("refresh_tokens_token_idx").on(table.tokenHash),
  }),
);

// ─── Roles ───────────────────────────────────────────────────────────────────

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull().unique(),
  description: text("description"),
  level: integer("level").notNull().default(0),
  type: text("type").notNull().default("custom"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Role ↔ Permission ───────────────────────────────────────────────────────

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({
      name: "pk_role_permissions",
      columns: [t.roleId, t.permissionCode],
    }),
    roleIdx: index("idx_role_permissions_role_id").on(t.roleId),
  }),
);

// ─── User ↔ Role ─────────────────────────────────────────────────────────────

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    grantedBy: uuid("granted_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => ({
    pk: primaryKey({ name: "pk_user_roles", columns: [t.userId, t.roleId] }),
    userIdx: index("idx_user_roles_user_id").on(t.userId),
    roleIdx: index("idx_user_roles_role_id").on(t.roleId),
    grantedByIdx: index("idx_user_roles_granted_by").on(t.grantedBy),
  }),
);

// ─── Permission Hierarchy ────────────────────────────────────────────────────
// A single hop: parent inherits child's effective scope.
// attendance:view:all → attendance:view:department → attendance:view:self

export const permissionHierarchy = pgTable(
  "permission_hierarchy",
  {
    parentPermission: text("parent_permission")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
    childPermission: text("child_permission")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({
      name: "pk_permission_hierarchy",
      columns: [t.parentPermission, t.childPermission],
    }),
    parentIdx: index("idx_perm_hierarchy_parent").on(t.parentPermission),
    childIdx: index("idx_perm_hierarchy_child").on(t.childPermission),
  }),
);

// ─── Access Grants ───────────────────────────────────────────────────────────

export const accessGrants = pgTable(
  "access_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    approvedByUserId: uuid("approved_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: uuid("revoked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_access_grants_user_id").on(t.userId),
    permissionIdx: index("idx_access_grants_permission_code").on(t.permissionCode),
    expiresAtIdx: index("idx_access_grants_expires_at").on(t.expiresAt),
  }),
);

// ─── Access Denials ──────────────────────────────────────────────────────────

export const accessDenials = pgTable(
  "access_denials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_access_denials_user_id").on(t.userId),
    permissionIdx: index("idx_access_denials_permission_code").on(t.permissionCode),
  }),
);

// ─── Access Audit Logs ───────────────────────────────────────────────────────

export const accessAuditLogs = pgTable(
  "access_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    permissionCode: text("permission_code"),
    roleId: uuid("role_id").references(() => roles.id, { onDelete: "set null" }),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    actorIdx: index("idx_access_audit_logs_actor_user_id").on(t.actorUserId),
    targetIdx: index("idx_access_audit_logs_target_user_id").on(t.targetUserId),
    actionIdx: index("idx_access_audit_logs_action").on(t.action),
    createdAtIdx: index("idx_access_audit_logs_created_at").on(t.createdAt),
  }),
);

// ─── Authorization Audit Log ─────────────────────────────────────────────────

export const authorizationAuditLog = pgTable(
  "authorization_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    resource: text("resource"),
    resourceId: text("resource_id"),
    allowed: boolean("allowed").notNull(),
    policyUsed: text("policy_used"),
    permissionsChecked: text("permissions_checked").array(),
    rolesActive: text("roles_active").array(),
    reason: text("reason"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdx: index("idx_authz_audit_user_id").on(t.userId),
    createdAtIdx: index("idx_authz_audit_created_at").on(t.createdAt),
    actionIdx: index("idx_authz_audit_action").on(t.action),
    allowedIdx: index("idx_authz_audit_allowed").on(t.allowed),
    resourceIdIdx: index("idx_authz_audit_resource_id").on(t.resourceId),
    requestIdIdx: index("idx_authz_audit_request_id").on(t.requestId),
  }),
);
