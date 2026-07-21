import { pgEnum } from "drizzle-orm/pg-core";

export const approvalRequestStatusEnum = pgEnum(
  "approval_request_status_enum",
  ["pending", "approved", "rejected", "cancelled"],
);

export const approvalStepStatusEnum = pgEnum("approval_step_status_enum", [
  "pending",
  "approved",
  "rejected",
  "skipped",
]);
