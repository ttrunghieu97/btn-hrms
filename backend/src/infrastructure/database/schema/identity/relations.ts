import { relations } from "drizzle-orm";
import {
  users,
  permissions,
  userPermissions,
  refreshTokens,
  roles,
  rolePermissions,
  userRoles,
  accessGrants,
  accessDenials,
  accessAuditLogs,
  authorizationAuditLog,
} from "./tables";

import { employees } from "../workforce/tables";
import { taskDelegations } from "../tasks/tables";
import { auditLogs } from "../_shared/audit-logs";

export const usersRelations = relations(users, ({ many, one }) => ({
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
  userPermissions: many(userPermissions),
  userRoles: many(userRoles, { relationName: "user_role_user" }),
  refreshTokens: many(refreshTokens),
  auditLogs: many(auditLogs),
  delegationsFrom: many(taskDelegations, { relationName: "delegator" }),
  delegationsTo: many(taskDelegations, { relationName: "delegatee" }),
  accessGrants: many(accessGrants),
  accessDenials: many(accessDenials),
  accessAuditLogsAsActor: many(accessAuditLogs, { relationName: "access_audit_actor" }),
  accessAuditLogsAsTarget: many(accessAuditLogs, { relationName: "access_audit_target" }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  userPermissions: many(userPermissions),
  accessGrants: many(accessGrants),
  accessDenials: many(accessDenials),
}));

export const userPermissionsRelations = relations(
  userPermissions,
  ({ one }) => ({
    user: one(users, {
      fields: [userPermissions.userId],
      references: [users.id],
    }),
    permission: one(permissions, {
      fields: [userPermissions.permissionCode],
      references: [permissions.code],
    }),
    grantedByUser: one(users, {
      fields: [userPermissions.grantedBy],
      references: [users.id],
      relationName: "user_permission_granted_by",
    }),
  }),
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionCode],
      references: [permissions.code],
    }),
  }),
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
    relationName: "user_role_user",
  }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  grantedByUser: one(users, {
    fields: [userRoles.grantedBy],
    references: [users.id],
  }),
}));

export const accessGrantsRelations = relations(accessGrants, ({ one }) => ({
  user: one(users, { fields: [accessGrants.userId], references: [users.id] }),
  permission: one(permissions, {
    fields: [accessGrants.permissionCode],
    references: [permissions.code],
  }),
  approvedByUser: one(users, {
    fields: [accessGrants.approvedByUserId],
    references: [users.id],
    relationName: "access_grant_approved_by",
  }),
  revokedByUser: one(users, {
    fields: [accessGrants.revokedByUserId],
    references: [users.id],
    relationName: "access_grant_revoked_by",
  }),
}));

export const accessDenialsRelations = relations(accessDenials, ({ one }) => ({
  user: one(users, { fields: [accessDenials.userId], references: [users.id] }),
  permission: one(permissions, {
    fields: [accessDenials.permissionCode],
    references: [permissions.code],
  }),
  createdByUser: one(users, {
    fields: [accessDenials.createdByUserId],
    references: [users.id],
    relationName: "access_denial_created_by",
  }),
}));

export const accessAuditLogsRelations = relations(accessAuditLogs, ({ one }) => ({
  actorUser: one(users, {
    fields: [accessAuditLogs.actorUserId],
    references: [users.id],
    relationName: "access_audit_actor",
  }),
  targetUser: one(users, {
    fields: [accessAuditLogs.targetUserId],
    references: [users.id],
    relationName: "access_audit_target",
  }),
  role: one(roles, { fields: [accessAuditLogs.roleId], references: [roles.id] }),
}));

export const authorizationAuditLogRelations = relations(
  authorizationAuditLog,
  ({ one }) => ({
    user: one(users, {
      fields: [authorizationAuditLog.userId],
      references: [users.id],
    }),
  }),
);
