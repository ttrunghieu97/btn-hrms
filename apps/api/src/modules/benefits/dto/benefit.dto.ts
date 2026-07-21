export class CreatePlanDto {
  name!: string; description?: string; providerId?: string;
  coverageType!: "employee_only" | "employee_plus_one" | "family";
  employerContribution?: number; employeeContribution?: number;
  effectiveFrom?: string; effectiveTo?: string; maxEligibleAge?: number;
}
export class EnrollEmployeeDto {
  planId!: string; employeeId!: string;
  coverageType!: "employee_only" | "employee_plus_one" | "family";
  effectiveFrom?: string;
}
export class AddDependentDto {
  enrollmentId!: string; fullName!: string;
  relationship!: string; dateOfBirth?: string;
}
export class PlanResponseDto {
  id!: string; name!: string; status!: string; coverageType!: string;
  employerContribution!: string; employeeContribution!: string;
}
export class EnrollmentResponseDto {
  id!: string; planId!: string; employeeId!: string;
  status!: string; coverageType!: string;
}
