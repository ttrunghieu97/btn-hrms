import { asc } from "drizzle-orm";
import {
  certifications,
  departments,
  employees,
  jobAssignments,
  positions,
  users,
} from "../../../../infrastructure/database/schema";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EMPLOYEE_FIELDS = [
  "id",
  "userId",
  "firstName",
  "lastName",
  "employeeCode",
  "avatarFileId",
  "dob",
  "gender",
  "address",
  "phoneNumber",
  "departmentId",
  "startDate",
  "endDate",
  "status",
  "identityNumber",
  "identityDate",
  "identityPlace",
  "createdAt",
  "updatedAt",
] as const;

export const EMPLOYEE_RELATIONS = [
  "user",
  "certifications",
  "documents",
  "employmentRecords",
  "contracts",
  "orgAssignments",
  "jobAssignments",
] as const;

export const EMPLOYEE_SORT_FIELDS = {
  createdAt: employees.createdAt,
  updatedAt: employees.updatedAt,
  firstName: employees.firstName,
  lastName: employees.lastName,
  employeeCode: employees.employeeCode,
  startDate: employees.startDate,
  status: employees.status,
  username: users.username,
  department: departments.name,
  name: employees.firstName,
} as const;

export type EmployeeSortField = keyof typeof EMPLOYEE_SORT_FIELDS;

export const EMPLOYEE_SORT_ALIASES: Record<string, EmployeeSortField> = {
  id: "createdAt",
};

export class EmployeeQueryBuilder {
  static buildEmployeeWithRelations(
    withRelations?: Record<string, any>,
  ): any {
    const result: any = {
      user: withRelations?.user ?? true,
      avatarFile: true,
    };

    if (withRelations?.certifications || !withRelations) {
      result.certifications = {
        orderBy: [asc(certifications.issuedDate)],
        with: {
          file: true,
        },
      };
    }

    if (withRelations?.documents || !withRelations) {
      result.documents = {
        with: {
          file: true,
        },
      };
    }

    if (withRelations?.employmentRecords || !withRelations) {
      result.employmentRecords = true;
    }

    if (withRelations?.contracts || !withRelations) {
      result.contracts = true;
    }

    if (withRelations?.orgAssignments || !withRelations) {
      result.orgAssignments = {
        with: {
          department: true,
        },
      };
    }

    if (withRelations?.jobAssignments || !withRelations) {
      result.jobAssignments = {
        orderBy: [asc(jobAssignments.startDate)],
        with: {
          position: true,
        },
      };
    }

    return result;
  }
}

