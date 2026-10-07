import { Injectable } from "@nestjs/common";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { Violation } from "../reconciliation.service";

type ViolationInsert = typeof schema.attendanceViolations.$inferInsert;

@Injectable()
export class ViolationRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async persistViolations(
    date: string,
    violations: Violation[],
  ): Promise<void> {
    if (violations.length === 0) return;

    const rows: ViolationInsert[] = violations.map((v) => ({
      employeeId: v.employeeId,
      code: v.type,
      severity: mapSeverity(v.severity),
      status: "OPEN",
      autoResolvable: false,
      requiresApproval: true,
      metadata: {
        ...(v.assignmentId ? { assignmentId: v.assignmentId } : {}),
        message: v.message,
      },
    }));

    await this.db.insert(schema.attendanceViolations).values(rows);
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
