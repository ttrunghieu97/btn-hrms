export type ResourceEntityName =
  | "Employee"
  | "Schedule"
  | "Attendance"
  | "Department"
  | "AuditLog"
  | "Task"
  | "Payroll";

export interface IResourceContextReader {
  load(entityName: ResourceEntityName, paramValue: string): Promise<unknown>;
}
