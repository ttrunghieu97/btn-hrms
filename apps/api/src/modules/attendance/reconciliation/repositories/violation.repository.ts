import { Injectable } from "@nestjs/common";
import { inArray } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { Violation } from "../reconciliation.service";

type ViolationInsert = typeof schema.attendanceViolations.$inferInsert;

function buildDedupKey(
  employeeId: string,
  date: string,
  assignmentId: string | undefined,
  code: string,
): string {
  return `${employeeId}::${date}::${assignmentId ?? ""}::${code}`;
}

@Injectable()
export class ViolationRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async persistViolations(
    date: string,
    violations: Violation[],
  ): Promise<void> {
    if (violations.length === 0) return;

    // 1. Deduplicate incoming batch by (employeeId, date, assignmentId, code)
    const uniqueIncoming = new Map<string, Violation>();
    for (const v of violations) {
      const key = buildDedupKey(v.employeeId, date, v.assignmentId, v.type);
      if (!uniqueIncoming.has(key)) {
        uniqueIncoming.set(key, v);
      }
    }

    // 2. Check existing violations for affected employees so rerunning reconciliation
    //    for the same date does not insert duplicate rows or overwrite resolved/waived rows.
    const existingKeys = new Set<string>();
    const employeeIds = Array.from(
      new Set(Array.from(uniqueIncoming.values()).map((v) => v.employeeId)),
    );

    if (
      employeeIds.length > 0 &&
      typeof this.db.query?.attendanceViolations?.findMany === "function"
    ) {
      const existingRows = await this.db.query.attendanceViolations.findMany({
        where: inArray(schema.attendanceViolations.employeeId, employeeIds),
      });
      for (const row of existingRows) {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        const rowDate = typeof meta.date === "string" ? meta.date : undefined;
        const rowAssignmentId =
          typeof meta.assignmentId === "string" ? meta.assignmentId : undefined;
        const rowDedupKey =
          typeof meta.dedupKey === "string"
            ? meta.dedupKey
            : rowDate
              ? buildDedupKey(row.employeeId, rowDate, rowAssignmentId, row.code)
              : undefined;
        if (rowDedupKey) {
          existingKeys.add(rowDedupKey);
        }
      }
    }

    const rows: ViolationInsert[] = [];
    for (const [dedupKey, v] of uniqueIncoming.entries()) {
      if (existingKeys.has(dedupKey)) {
        continue;
      }
      rows.push({
        employeeId: v.employeeId,
        code: v.type,
        severity: mapSeverity(v.severity),
        status: "OPEN",
        autoResolvable: false,
        requiresApproval: true,
        metadata: {
          date,
          dedupKey,
          ...(v.assignmentId ? { assignmentId: v.assignmentId } : {}),
          message: v.message,
        },
      });
    }

    if (rows.length === 0) return;

    const insertBuilder = this.db.insert(schema.attendanceViolations).values(rows);
    if (typeof (insertBuilder as any).onConflictDoNothing === "function") {
      await (insertBuilder as any).onConflictDoNothing();
      return;
    }
    await insertBuilder;
  }
}

function mapSeverity(severity: Violation["severity"]): "INFO" | "WARNING" | "ERROR" | "CRITICAL" {
  switch (severity) {
    case "LOW":
      return "WARNING";
    case "MEDIUM":
      return "ERROR";
    case "HIGH":
      return "CRITICAL";
  }
}
