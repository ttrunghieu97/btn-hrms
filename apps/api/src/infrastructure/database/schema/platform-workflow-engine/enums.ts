import { pgEnum } from "drizzle-orm/pg-core";

export const workflowInstanceStatusEnum = pgEnum(
  "workflow_instance_status_enum",
  ["active", "completed", "cancelled", "failed"],
);
