import type { EmployeeWithRelations } from "../../modules/workforce/employees/repositories/employees.repository";

export const EMPLOYEE_READER_PORT = "EMPLOYEE_READER_PORT";

export interface IEmployeeReader {
  findById(id: string): Promise<EmployeeWithRelations | null>;
  findEmployeeById(employeeId: string): Promise<Partial<EmployeeWithRelations> | null>;
  findByIdentifier(identifier: string): Promise<Partial<EmployeeWithRelations> | null>;
  findEmployeeByUserId(userId: string): Promise<Partial<EmployeeWithRelations> | null>;
  countActiveEmployeesByPositions(): Promise<Record<string, number>>;
  countActiveEmployeesByDepartments(): Promise<Record<string, number>>;
  findActiveEmployees(departmentId?: string): Promise<any[]>;
}
