import { relations } from "drizzle-orm";
import { systemHealthChecks } from "./tables";

export const systemHealthChecksRelations = relations(
  systemHealthChecks,
  () => ({}),
);
