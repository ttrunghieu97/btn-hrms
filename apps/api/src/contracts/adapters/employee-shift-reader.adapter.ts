import { Inject, Injectable } from "@nestjs/common";
import {
  type EmployeeShiftReaderPort,
  type ShiftAssignmentRecord,
} from "../ports/employee-shift-reader.port";
import { WorkforceShiftsRepository } from "../../modules/scheduling/shifts/schedule-roster/repositories/workforce-shifts.repository";
import { and, eq, gte, lte, ne, or, isNull, desc, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import * as schema from "../../infrastructure/database/schema";

@Injectable()
export class EmployeeShiftReaderAdapter implements EmployeeShiftReaderPort {
  constructor(
    private readonly shiftRepo: WorkforceShiftsRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getEmployeeAssignmentsForRange(
    employeeId: string,
    from: string,
    to: string,
  ): Promise<ShiftAssignmentRecord[]> {
    return this.shiftRepo.getEmployeeAssignmentsForRange(
      employeeId,
      from,
      to,
    ) as Promise<ShiftAssignmentRecord[]>;
  }

  async findShiftAssignmentForEmployeeDay(
    employeeId: string,
    workDate: string,
  ): Promise<ShiftAssignmentRecord | null> {
    const db = (this.shiftRepo as any).db;
    const row = await (db.query).employeeShiftAssignments.findFirst({
      where: and(
        eq(schema.employeeShiftAssignments.employeeId, employeeId),
        lte(schema.employeeShiftAssignments.effectiveFrom, workDate),
        or(
          gte(schema.employeeShiftAssignments.effectiveTo, workDate),
          isNull(schema.employeeShiftAssignments.effectiveTo),
        ),
        ne(schema.employeeShiftAssignments.status, "cancelled"),
      ),
      with: {
        shiftTemplate: true,
      },
      orderBy: [desc(schema.employeeShiftAssignments.effectiveFrom)],
    });
    return (row as ShiftAssignmentRecord | undefined) ?? null;
  }

  async findAssignmentsByDate(
    employeeIds: string[],
    date: string,
  ): Promise<ShiftAssignmentRecord[]> {
    if (employeeIds.length === 0) return [];
    const rows = await this.db
      .select({
        id: schema.employeeShiftAssignments.id,
        employeeId: schema.employeeShiftAssignments.employeeId,
        shiftTemplateId: schema.employeeShiftAssignments.shiftTemplateId,
        assignmentDate: schema.employeeShiftAssignments.assignmentDate,
        effectiveFrom: schema.employeeShiftAssignments.effectiveFrom,
        effectiveTo: schema.employeeShiftAssignments.effectiveTo,
        status: schema.employeeShiftAssignments.status,
        shiftTemplate: {
          name: schema.shiftTemplates.name,
          startTime: schema.shiftTemplates.startTime,
          endTime: schema.shiftTemplates.endTime,
          isNightShift: schema.shiftTemplates.isNightShift,
          breakMinutes: schema.shiftTemplates.breakMinutes,
        },
      })
      .from(schema.employeeShiftAssignments)
      .leftJoin(
        schema.shiftTemplates,
        eq(schema.employeeShiftAssignments.shiftTemplateId, schema.shiftTemplates.id),
      )
      .where(
        and(
          eq(schema.employeeShiftAssignments.assignmentDate, date),
          inArray(schema.employeeShiftAssignments.employeeId, employeeIds),
        ),
      );
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      shiftTemplateId: r.shiftTemplateId,
      assignmentDate: r.assignmentDate,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      status: r.status,
      shiftTemplate: r.shiftTemplate
        ? {
            name: r.shiftTemplate.name,
            startTime: r.shiftTemplate.startTime,
            endTime: r.shiftTemplate.endTime,
            isNightShift: r.shiftTemplate.isNightShift,
            breakMinutes: r.shiftTemplate.breakMinutes,
          }
        : null,
    }));
  }
}
