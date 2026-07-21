import { pgEnum } from "drizzle-orm/pg-core";

export const requestIdempotencyStatusEnum = pgEnum(
  "request_idempotency_status_enum",
  ["pending", "completed", "failed"],
);

export const fileStatusEnum = pgEnum("file_status_enum", [
  "temp",
  "active",
  "archived",
  "replaced",
  "orphan",
  "finalize_failed",
  "pending_upload",
]);


