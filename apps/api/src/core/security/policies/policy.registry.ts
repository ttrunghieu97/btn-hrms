/**
 * PolicyRegistry — the single source of truth for all policy handler singletons.
 *
 * Domain modules never import individual policy files — they reference this
 * registry. This keeps the DI graph clean and makes policy discovery trivial.
 *
 * To add a new domain, export its policies here and re-export from index.ts.
 */
import { EmployeePolicies } from "./employee.policy";
import { AttendancePolicies } from "./attendance.policy";
import { TaskPolicies } from "./task.policy";
import {
  DepartmentPolicies,
  SchedulePolicies,
  PayrollPolicies,
} from "./workforce.policy";
import {
  UserPolicies,
  RolePolicies,
  AuditLogPolicies,
  FilePolicies,
} from "./identity.policy";
import { RecruitmentPolicies } from "./recruitment.policy";
import { AssetPolicies } from "./asset.policy";
import { PerformancePolicies } from "./performance.policy";
import { BenefitsPolicies } from "./benefits.policy";
import { ExpensesPolicies } from "./expenses.policy";
import { LearningPolicies } from "./learning.policy";
import { OffboardingPolicies } from "./offboarding.policy";

export const PolicyRegistry = {
  Employee: EmployeePolicies,
  Attendance: AttendancePolicies,
  Task: TaskPolicies,
  Department: DepartmentPolicies,
  Schedule: SchedulePolicies,
  Payroll: PayrollPolicies,
  User: UserPolicies,
  Role: RolePolicies,
  AuditLog: AuditLogPolicies,
  File: FilePolicies,
  Recruitment: RecruitmentPolicies,
  Asset: AssetPolicies,
  Performance: PerformancePolicies,
  Benefits: BenefitsPolicies,
  Expenses: ExpensesPolicies,
  Learning: LearningPolicies,
  Offboarding: OffboardingPolicies,
};

export type PolicyDomain = keyof typeof PolicyRegistry;
