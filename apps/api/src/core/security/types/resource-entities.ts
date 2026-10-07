/**
 * Resource entity token classes for the @Resource() decorator.
 *
 * These are thin marker classes — their only purpose is to carry a `.name`
 * string that the ResourceLoaderRepository uses to dispatch to the correct
 * DB query.  They carry no runtime data.
 *
 * Usage:
 *   @Resource(Employee)           → loads by :id param
 *   @Resource(Employee, "username") → loads by :username param
 */
import type { ResourceEntityName } from "../../../contracts/ports/resource-context-reader.port";

export class Employee {
  static readonly resourceName: ResourceEntityName = "Employee";
}

export class Department {
  static readonly resourceName: ResourceEntityName = "Department";
}

export class Attendance {
  static readonly resourceName: ResourceEntityName = "Attendance";
}

export class Schedule {
  static readonly resourceName: ResourceEntityName = "Schedule";
}

export class Task {
  static readonly resourceName: ResourceEntityName = "Task";
}

export class Payroll {
  static readonly resourceName: ResourceEntityName = "Payroll";
}

export class AuditLog {
  static readonly resourceName: ResourceEntityName = "AuditLog";
}
