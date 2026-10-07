import { Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { IEmployeeReader } from "../ports/employee-reader.port";
import { EmployeesRepository, type EmployeeWithRelations } from "../../modules/workforce/employees/repositories/employees.repository";
import { employees, orgAssignments } from "../../infrastructure/database/schema";

const PII_FIELDS = [
  "identityNumber",
  "bankAccountNumber",
  "taxCode",
  "emergencyContactName",
  "emergencyContactPhone",
] as const;

function stripPii(row: any): any {
  if (!row) return row;
  const result = { ...row };
  for (const field of PII_FIELDS) {
    result[field] = null;
  }
  return result;
}

@Injectable()
export class EmployeeReaderAdapter implements IEmployeeReader {
  constructor(private readonly repo: EmployeesRepository) {}

  async findById(id: string): Promise<EmployeeWithRelations | null> {
    return stripPii(await this.repo.findById(id));
  }

  async findEmployeeById(employeeId: string): Promise<Partial<EmployeeWithRelations> | null> {
    return stripPii(await this.repo.findEmployeeById(employeeId));
  }

  async findByIdentifier(identifier: string): Promise<Partial<EmployeeWithRelations> | null> {
    return stripPii(await this.repo.findByIdentifier(identifier));
  }

  async findEmployeeByUserId(userId: string): Promise<Partial<EmployeeWithRelations> | null> {
    return stripPii(await this.repo.findEmployeeByUserId(userId));
  }

  async findEmployeesByUserIds(userIds: string[]): Promise<Array<Partial<EmployeeWithRelations>>> {
    const rows = await this.repo.findEmployeesByUserIds(userIds);
    return rows.map((r: any) => stripPii(r));
  }

  async countActiveEmployeesByPositions(): Promise<Record<string, number>> {
    return this.repo.countActiveByPositions();
  }

  async countActiveEmployeesByDepartments(): Promise<Record<string, number>> {
    return this.repo.countActiveByDepartments();
  }

  async findActiveEmployees(departmentId?: string): Promise<any[]> {
    const activeStatuses = ["working", "probation"] as const;
    const statusCond = inArray(employees.status, activeStatuses as any);
    const whereCond = departmentId
      ? and(statusCond, eq(employees.departmentId, departmentId))
      : statusCond;
    const rows = await this.repo.findManyRaw({
      where: whereCond as any,
      with: {
        department: true,
        orgAssignments: {
          where: eq(orgAssignments.isCurrent, true) as any,
        },
      },
    });
    return rows.map(stripPii);
  }
}
