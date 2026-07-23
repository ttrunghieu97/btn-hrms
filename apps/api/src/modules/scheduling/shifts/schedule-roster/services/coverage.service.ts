import { Injectable, Inject } from "@nestjs/common";
import { eq, and, ne, sql, inArray, isNotNull } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../../infrastructure/database/schema";

export interface CoverageRow {
  scheduleId: string;
  date: string;
  locationId?: string;
  locationName?: string;
  workRoleId?: string;
  workRoleName?: string;
  shiftTemplateId?: string;
  shiftTemplateName?: string;
  required: number;
  assigned: number;
}

@Injectable()
export class CoverageService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async getCoverage(date: string): Promise<CoverageRow[]> {
    // Get schedule & requirements
    const schedule = await this.db.query.dailySchedules.findFirst({
      where: eq(schema.dailySchedules.date, date),
    });
    if (!schedule) return [];

    const requirements = await this.db.query.scheduleRequirements.findMany({
      where: eq(schema.scheduleRequirements.scheduleId, schedule.id),
      with: {
        location: { columns: { id: true, name: true } },
        workRole: { columns: { id: true, name: true } },
        shiftTemplate: { columns: { id: true, name: true, startTime: true, endTime: true } },
      },
    });

    if (requirements.length === 0) return [];

    // Count assignments grouped by (location, workRole, shiftTemplate) for this date
    const assignments = await this.db
      .select({
        locationId: schema.employeeShiftAssignments.locationId,
        workRoleId: schema.employeeShiftAssignments.positionId,
        shiftTemplateId: schema.employeeShiftAssignments.shiftTemplateId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.employeeShiftAssignments)
      .where(
        and(
          eq(schema.employeeShiftAssignments.assignmentDate, date),
          ne(schema.employeeShiftAssignments.status, "cancelled"),
          isNotNull(schema.employeeShiftAssignments.positionId),
        )
      )
      .groupBy(
        schema.employeeShiftAssignments.locationId,
        schema.employeeShiftAssignments.positionId,
        schema.employeeShiftAssignments.shiftTemplateId,
      );

    // Build lookup: "(locationId)|(workRoleId)|(shiftTemplateId)" → count
    const assignedMap = new Map<string, number>();
    for (const a of assignments) {
      const key = `${a.locationId ?? ""}|${a.workRoleId ?? ""}|${a.shiftTemplateId ?? ""}`;
      assignedMap.set(key, a.count);
    }

    return requirements.map((r) => {
      const loc = (r as any).location as { id: string; name: string } | undefined;
      const role = (r as any).workRole as { id: string; name: string } | undefined;
      const shift = (r as any).shiftTemplate as { id: string; name: string } | undefined;
      const key = `${r.locationId ?? ""}|${r.workRoleId ?? ""}|${r.shiftTemplateId ?? ""}`;
      const assigned = assignedMap.get(key) ?? 0;
      return {
        scheduleId: schedule.id,
        date,
        locationId: r.locationId ?? undefined,
        locationName: loc?.name ?? "",
        workRoleId: r.workRoleId ?? undefined,
        workRoleName: role?.name ?? "",
        shiftTemplateId: r.shiftTemplateId ?? undefined,
        shiftTemplateName: shift?.name ?? "",
        required: r.requiredCount,
        assigned,
      };
    });
  }
}
