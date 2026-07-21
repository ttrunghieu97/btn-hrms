import { pgEnum } from "drizzle-orm/pg-core";

export const violationSeverityEnum = pgEnum("violation_severity_enum", [
  "INFO",
  "WARNING",
  "ERROR",
  "CRITICAL",
]);

export const violationStatusEnum = pgEnum("violation_status_enum", [
  "OPEN",
  "RESOLVED",
  "WAIVED",
]);
