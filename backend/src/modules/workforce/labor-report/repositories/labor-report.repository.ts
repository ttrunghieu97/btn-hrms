import { Injectable, Inject } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import {
  employees,
  employeeIdentifiers,
  employeeContracts,
  positions,
  jobAssignments,
  allowances,
  socialInsuranceEnrollments,
  salaryStructures,
  orgAssignments,
} from "../../../../infrastructure/database/schema";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";

export interface EmployeeReportRaw {
  id: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: string | null;
  identityNumber: string | null;
  status: string | null;
  socialInsuranceNo: string | null;
  positionTitle: string | null;
  jobCategory: string | null;
  baseSalary: string | null;
  allowances: { type: string; amount: string }[];
  contractType: string | null;
  contractEffectiveFrom: string | null;
  contractEffectiveTo: string | null;
  siStart: string | null;
  siEnd: string | null;
  orgJobTitle: string | null;
}

@Injectable()
export class LaborReportRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async findAllActiveEmployees(): Promise<EmployeeReportRaw[]> {
    const employeeRows = await this.db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        dob: employees.dob,
        gender: employees.gender,
        identityNumber: employees.identityNumber,
        status: employees.status,
      })
      .from(employees)
      .where(isNull(employees.deletedAt));

    const result: EmployeeReportRaw[] = [];

    for (const emp of employeeRows) {
      if (emp.status === "terminated") continue;

      // Social insurance number
      const [siId] = await this.db
        .select({ value: employeeIdentifiers.identifierValue })
        .from(employeeIdentifiers)
        .where(
          and(
            eq(employeeIdentifiers.employeeId, emp.id),
            eq(employeeIdentifiers.identifierType, "social_insurance"),
          ),
        )
        .limit(1);

      // Current job assignment with position (for jobCategory)
      const [job] = await this.db
        .select({
          positionName: positions.name,
          jobCategory: positions.jobCategory,
        })
        .from(jobAssignments)
        .innerJoin(positions, eq(jobAssignments.positionId, positions.id))
        .where(
          and(
            eq(jobAssignments.employeeId, emp.id),
            eq(jobAssignments.isPrimary, true),
            isNull(jobAssignments.deletedAt),
          ),
        )
        .limit(1);

      // Org assignment for job title
      const [orgAssign] = await this.db
        .select({ jobTitle: orgAssignments.jobTitle })
        .from(orgAssignments)
        .where(
          and(
            eq(orgAssignments.employeeId, emp.id),
            eq(orgAssignments.isCurrent, true),
          ),
        )
        .limit(1);

      // Current salary
      const [salary] = await this.db
        .select({ baseSalary: salaryStructures.baseSalary })
        .from(salaryStructures)
        .where(
          and(
            eq(salaryStructures.employeeId, emp.id),
            eq(salaryStructures.isCurrent, true),
          ),
        )
        .limit(1);

      // Allowances
      const allowanceRows = await this.db
        .select({
          type: allowances.type,
          amount: allowances.amount,
        })
        .from(allowances)
        .where(eq(allowances.employeeId, emp.id));

      // Current contract
      const [contract] = await this.db
        .select({
          contractType: employeeContracts.contractType,
          effectiveFrom: employeeContracts.effectiveFrom,
          effectiveTo: employeeContracts.effectiveTo,
        })
        .from(employeeContracts)
        .where(
          and(
            eq(employeeContracts.employeeId, emp.id),
            eq(employeeContracts.isCurrent, true),
          ),
        )
        .limit(1);

      // Social insurance enrollment
      const [siEnroll] = await this.db
        .select({
          startDate: socialInsuranceEnrollments.startDate,
          endDate: socialInsuranceEnrollments.endDate,
        })
        .from(socialInsuranceEnrollments)
        .where(
          and(
            eq(socialInsuranceEnrollments.employeeId, emp.id),
            eq(socialInsuranceEnrollments.status, "active"),
          ),
        )
        .limit(1);

      result.push({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        dob: emp.dob,
        gender: emp.gender,
        identityNumber: emp.identityNumber,
        status: emp.status,
        socialInsuranceNo: siId?.value ?? null,
        positionTitle: job?.positionName ?? orgAssign?.jobTitle ?? null,
        jobCategory: job?.jobCategory ?? null,
        baseSalary: salary?.baseSalary ?? null,
        allowances: allowanceRows.map((a) => ({ type: a.type, amount: a.amount ?? "0" })),
        contractType: contract?.contractType ?? null,
        contractEffectiveFrom: contract?.effectiveFrom ?? null,
        contractEffectiveTo: contract?.effectiveTo ?? null,
        siStart: siEnroll?.startDate ?? null,
        siEnd: siEnroll?.endDate ?? null,
        orgJobTitle: orgAssign?.jobTitle ?? null,
      });
    }

    return result;
  }
}
