import {  Inject , Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.provider";
import { AppDatabase } from "../database/database-client.type";
import * as schema from "../database/schema";
import type { ResourceEntityName } from "../../contracts/ports/resource-context-reader.port";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ResourceLoaderRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async load(entityName: ResourceEntityName, paramValue: string) {
    switch (entityName) {
      case "Employee":
        return this.loadEmployee(paramValue);
      case "Schedule":
        return this.loadSchedule(paramValue);
      case "Attendance":
        return this.loadAttendance(paramValue);
      case "Department":
        return this.loadDepartment(paramValue);
      case "AuditLog":
        return this.loadAuditLog(paramValue);
      case "Task":
        return this.loadTask(paramValue);
      case "Payroll":
        return this.loadPayroll(paramValue);
      default:
        return null;
    }
  }

  private async loadEmployee(paramValue: string) {
    const isUuid = UUID_RE.test(paramValue);

    if (isUuid) {
      const [row] = await this.db
        .select({
          id: schema.employees.id,
          userId: schema.employees.userId,
          departmentId: schema.employees.departmentId,
        })
        .from(schema.employees)
        .where(eq(schema.employees.id, paramValue))
        .limit(1);
      return row ?? null;
    }

    const [row] = await this.db
      .select({
        id: schema.employees.id,
        userId: schema.employees.userId,
        departmentId: schema.employees.departmentId,
        username: schema.users.username,
      })
      .from(schema.employees)
      .innerJoin(schema.users, eq(schema.employees.userId, schema.users.id))
      .where(eq(schema.users.username, paramValue))
      .limit(1);

    return row ?? null;
  }

  private async loadSchedule(paramValue: string) {
    if (!UUID_RE.test(paramValue)) return null;
    const [row] = await this.db
      .select({
        id: schema.schedules.id,
        employeeId: schema.schedules.employeeId,
        departmentId: schema.employees.departmentId,
      })
      .from(schema.schedules)
      .innerJoin(
        schema.employees,
        eq(schema.schedules.employeeId, schema.employees.id),
      )
      .where(eq(schema.schedules.id, paramValue))
      .limit(1);
    return row ?? null;
  }

  private async loadAttendance(paramValue: string) {
    if (!UUID_RE.test(paramValue)) return null;
    const [row] = await this.db
      .select({
        id: schema.attendances.id,
        employeeId: schema.attendances.employeeId,
        departmentId: schema.employees.departmentId,
      })
      .from(schema.attendances)
      .innerJoin(
        schema.employees,
        eq(schema.attendances.employeeId, schema.employees.id),
      )
      .where(eq(schema.attendances.id, paramValue))
      .limit(1);
    return row ?? null;
  }

  private async loadDepartment(paramValue: string) {
    if (!UUID_RE.test(paramValue)) return null;
    const [row] = await this.db
      .select({
        id: schema.departments.id,
      })
      .from(schema.departments)
      .where(eq(schema.departments.id, paramValue))
      .limit(1);
    return row ?? null;
  }

  private async loadAuditLog(paramValue: string) {
    if (!UUID_RE.test(paramValue)) return null;
    const [row] = await this.db
      .select({
        id: schema.auditLogs.id,
      })
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.id, paramValue))
      .limit(1);
    return row ?? null;
  }

  private async loadTask(paramValue: string) {
    if (!UUID_RE.test(paramValue)) return null;
    const [row] = await this.db
      .select({
        id: schema.tasks.id,
        assigneeId: schema.tasks.assigneeId,
        departmentId: schema.employees.departmentId,
      })
      .from(schema.tasks)
      .leftJoin(
        schema.employees,
        eq(schema.tasks.assigneeId, schema.employees.id),
      )
      .where(eq(schema.tasks.id, paramValue))
      .limit(1);
    return row ?? null;
  }

  private async loadPayroll(paramValue: string) {
    // Legacy payroll routes now resolve through payslips, which are the active payroll artifact.
    if (!UUID_RE.test(paramValue)) return null;
    const [row] = await this.db
      .select({
        id: schema.payslips.id,
        employeeId: schema.payslips.employeeId,
        departmentId: schema.employees.departmentId,
      })
      .from(schema.payslips)
      .innerJoin(
        schema.employees,
        eq(schema.payslips.employeeId, schema.employees.id),
      )
      .where(eq(schema.payslips.id, paramValue))
      .limit(1);
    return row ?? null;
  }
}
