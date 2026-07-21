import { relations } from "drizzle-orm";
import {
  assetTypes,
  assets,
  assetStockLevels,
  assetRequests,
  assetRequestLines,
  assetIssues,
  assetIssueLines,
  assetHistoryEntries,
} from "./tables";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";

export const assetTypesRelations = relations(assetTypes, ({ one, many }) => ({
  assets: many(assets),
  stockLevel: one(assetStockLevels),
  requestLines: many(assetRequestLines),
  issueLines: many(assetIssueLines),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  assetType: one(assetTypes, {
    fields: [assets.assetTypeId],
    references: [assetTypes.id],
  }),
  issueLines: many(assetIssueLines),
}));

export const assetStockLevelsRelations = relations(
  assetStockLevels,
  ({ one }) => ({
    assetType: one(assetTypes, {
      fields: [assetStockLevels.assetTypeId],
      references: [assetTypes.id],
    }),
  }),
);

export const assetRequestsRelations = relations(
  assetRequests,
  ({ one, many }) => ({
    requester: one(employees, {
      fields: [assetRequests.requesterEmployeeId],
      references: [employees.id],
    }),
    decidedByUser: one(users, {
      fields: [assetRequests.decidedByUserId],
      references: [users.id],
    }),
    lines: many(assetRequestLines),
    issues: many(assetIssues),
  }),
);

export const assetRequestLinesRelations = relations(
  assetRequestLines,
  ({ one }) => ({
    request: one(assetRequests, {
      fields: [assetRequestLines.requestId],
      references: [assetRequests.id],
    }),
    assetType: one(assetTypes, {
      fields: [assetRequestLines.assetTypeId],
      references: [assetTypes.id],
    }),
  }),
);

export const assetIssuesRelations = relations(assetIssues, ({ one, many }) => ({
  employee: one(employees, {
    fields: [assetIssues.employeeId],
    references: [employees.id],
  }),
  request: one(assetRequests, {
    fields: [assetIssues.requestId],
    references: [assetRequests.id],
  }),
  issuedByUser: one(users, {
    fields: [assetIssues.issuedByUserId],
    references: [users.id],
  }),
  lines: many(assetIssueLines),
}));

export const assetIssueLinesRelations = relations(
  assetIssueLines,
  ({ one }) => ({
    issue: one(assetIssues, {
      fields: [assetIssueLines.issueId],
      references: [assetIssues.id],
    }),
    asset: one(assets, {
      fields: [assetIssueLines.assetId],
      references: [assets.id],
    }),
    assetType: one(assetTypes, {
      fields: [assetIssueLines.assetTypeId],
      references: [assetTypes.id],
    }),
    returnedToUser: one(users, {
      fields: [assetIssueLines.returnedToUserId],
      references: [users.id],
    }),
  }),
);

export const assetHistoryEntriesRelations = relations(
  assetHistoryEntries,
  ({ one }) => ({
    asset: one(assets, {
      fields: [assetHistoryEntries.assetId],
      references: [assets.id],
    }),
    assetType: one(assetTypes, {
      fields: [assetHistoryEntries.assetTypeId],
      references: [assetTypes.id],
    }),
    issue: one(assetIssues, {
      fields: [assetHistoryEntries.issueId],
      references: [assetIssues.id],
    }),
    issueLine: one(assetIssueLines, {
      fields: [assetHistoryEntries.issueLineId],
      references: [assetIssueLines.id],
    }),
    employee: one(employees, {
      fields: [assetHistoryEntries.employeeId],
      references: [employees.id],
    }),
    actorUser: one(users, {
      fields: [assetHistoryEntries.actorUserId],
      references: [users.id],
    }),
  }),
);
