import { Inject, Injectable } from "@nestjs/common";
import { formatDateISO } from "@/shared/utils/date-format";
import { and, eq, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TimeManagementPayrollPort } from "../ports/time-management-payroll.port";
import { PayrollInputAcl } from "../acls/payroll-input.acl";
import { CONTRACTS_TOKENS } from "../contracts.tokens";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import * as schema from "../../infrastructure/database/schema";

@Injectable()
export class TimeManagementPayrollAdapter implements TimeManagementPayrollPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CONTRACTS_TOKENS.PAYROLL_INPUT_ACL)
    private readonly payrollInputAcl: PayrollInputAcl,
  ) {}

  async getPayrollInputs(params: {
    employeeId: string;
    period: string;
  }): Promise<Record<string, unknown>[]> {
    const [year, month] = params.period.split("-").map(Number);
    if (!year || !month) return [];

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const rows = await this.db.query.attendances.findMany({
      where: and(
        eq(schema.attendances.employeeId, params.employeeId),
        gte(schema.attendances.time, start),
        lt(schema.attendances.time, end),
      ),
      columns: {
        type: true,
        time: true,
      },
    });

    const checkIns = rows.filter((row) => row.type === "check_in").length;
    const checkOuts = rows.filter((row) => row.type === "check_out").length;
    const workedHours = Math.max(0, Math.min(checkIns, checkOuts) * 8);

    const assignments = await this.db.query.employeeShiftAssignments.findMany({
      where: and(
        eq(schema.employeeShiftAssignments.employeeId, params.employeeId),
        lte(
          schema.employeeShiftAssignments.effectiveFrom,
          formatDateISO(end),
        ),
        or(
          gte(
            schema.employeeShiftAssignments.effectiveTo,
            formatDateISO(start),
          ),
          isNull(schema.employeeShiftAssignments.effectiveTo),
        ),
      ),
      with: {
        shiftTemplate: {
          columns: {
            startTime: true,
            endTime: true,
            breakMinutes: true,
            isNightShift: true,
          },
        },
      },
    });

    const scheduledHours = assignments.reduce(
      (total, assignment) => {
        const template = assignment.shiftTemplate;
        if (!template) return total;

        const startTime = toMinutes(template.startTime);
        const endTime = toMinutes(template.endTime);
        const raw = template.isNightShift
          ? 24 * 60 - startTime + endTime
          : endTime - startTime;
        const shiftHours = Math.max(0, raw - (template.breakMinutes ?? 0)) / 60;
        return total + shiftHours;
      },
      0,
    );

    const overtimeHours = Math.max(0, workedHours - scheduledHours);

    return this.payrollInputAcl
      .mapTimeSignalsToPayrollInputs({ workedHours, overtimeHours })
      .map((item) => ({ ...item }));
  }

  async getBatchPayrollInputs(params: {
    employeeIds: string[];
    period: string;
  }): Promise<Map<string, Record<string, unknown>[]>> {
    const resultMap = new Map<string, Record<string, unknown>[]>();
    if (params.employeeIds.length === 0) return resultMap;

    const [year, month] = params.period.split("-").map(Number);
    if (!year || !month) return resultMap;

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    // 1. Fetch all attendances for all employees
    const allAttendances = await this.db.query.attendances.findMany({
      where: and(
        inArray(schema.attendances.employeeId, params.employeeIds),
        gte(schema.attendances.time, start),
        lt(schema.attendances.time, end),
      ),
      columns: {
        employeeId: true,
        type: true,
      },
    });

    const attendanceMap = new Map<string, { checkIns: number; checkOuts: number }>();
    for (const row of allAttendances) {
      const stats = attendanceMap.get(row.employeeId) ?? { checkIns: 0, checkOuts: 0 };
      if (row.type === "check_in") stats.checkIns++;
      if (row.type === "check_out") stats.checkOuts++;
      attendanceMap.set(row.employeeId, stats);
    }

    // 2. Fetch all assignments for all employees
    const allAssignments = await this.db.query.employeeShiftAssignments.findMany({
      where: and(
        inArray(schema.employeeShiftAssignments.employeeId, params.employeeIds),
        lte(
          schema.employeeShiftAssignments.effectiveFrom,
          formatDateISO(end),
        ),
        or(
          gte(
            schema.employeeShiftAssignments.effectiveTo,
            formatDateISO(start),
          ),
          isNull(schema.employeeShiftAssignments.effectiveTo),
        ),
      ),
      with: {
        shiftTemplate: {
          columns: {
            startTime: true,
            endTime: true,
            breakMinutes: true,
            isNightShift: true,
          },
        },
      },
    });

    const assignmentMap = new Map<string, number>();
    for (const assignment of allAssignments) {
      const template = assignment.shiftTemplate;
      if (!template) continue;

      const startTime = toMinutes(template.startTime);
      const endTime = toMinutes(template.endTime);
      const raw = template.isNightShift
        ? 24 * 60 - startTime + endTime
        : endTime - startTime;
      const shiftHours = Math.max(0, raw - (template.breakMinutes ?? 0)) / 60;

      assignmentMap.set(
        assignment.employeeId,
        (assignmentMap.get(assignment.employeeId) ?? 0) + shiftHours
      );
    }

    // 3. Combine results
    for (const employeeId of params.employeeIds) {
      const stats = attendanceMap.get(employeeId) ?? { checkIns: 0, checkOuts: 0 };
      const workedHours = Math.max(0, Math.min(stats.checkIns, stats.checkOuts) * 8);
      const scheduledHours = assignmentMap.get(employeeId) ?? 0;
      const overtimeHours = Math.max(0, workedHours - scheduledHours);

      const inputs = this.payrollInputAcl
        .mapTimeSignalsToPayrollInputs({ workedHours, overtimeHours })
        .map((item) => ({ ...item }));

      resultMap.set(employeeId, inputs);
    }

    return resultMap;
  }

  async requestPayrollRecompute(
    _periodId: string,
  ): Promise<{ accepted: boolean }> {
    return { accepted: true };
  }
}

function toMinutes(value: string): number {
  const parts = value.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}
