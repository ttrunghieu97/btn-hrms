import { Injectable } from "@nestjs/common";
import { IEmployeeReader } from "../ports/employee-reader.port";
import { EmployeesRepository, type EmployeeWithRelations } from "../../modules/workforce/employees/repositories/employees.repository";

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

  async countActiveEmployeesByPositions(): Promise<Record<string, number>> {
    return this.repo.countActiveByPositions();
  }

  async countActiveEmployeesByDepartments(): Promise<Record<string, number>> {
    return this.repo.countActiveByDepartments();
  }

  async findActiveEmployees(departmentId?: string): Promise<any[]> {
    const rows = await this.repo.findManyRaw({
      where: (employees, { eq, and, inArray }) => {
        const activeStatuses = ["working", "probation"] as const;
        const statusCond = inArray(employees.status, activeStatuses);
        return departmentId
          ? and(statusCond, eq(employees.departmentId, departmentId))
          : statusCond;
      },
      with: {
        department: true,
        orgAssignments: {
          where: (item, { eq }) => eq(item.isCurrent, true),
        },
      },
    });
    return rows.map(stripPii);
  }
}

