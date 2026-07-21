import { pgEnum } from "drizzle-orm/pg-core";

export const educationLevelEnum = pgEnum("education_level_enum", [
  "primary",
  "lower_secondary",
  "upper_secondary",
  "vocational",
  "college",
  "bachelor",
  "master",
  "doctor",
  "other",
]);

export const employeeStatusEnum = pgEnum("employee_status_enum", [
  "working",
  "probation",
  "terminated",
  "leave",
  "suspended",
  "retired",
]);

export const employmentTypeEnum = pgEnum("employment_type_enum", [
  "permanent",
  "fixed_term",
  "probationary",
  "internship",
  "contractor",
  "part_time",
]);

export const contractTypeEnum = pgEnum("contract_type_enum", [
  "permanent",
  "fixed_term",
  "probationary",
  "internship",
  "service",
  "part_time",
]);

export const contractStatusEnum = pgEnum("contract_status_enum", [
  "draft",
  "active",
  "terminated",
  "superseded",
]);

export const orgAssignmentTypeEnum = pgEnum("org_assignment_type_enum", [
  "primary",
  "secondary",
  "temporary",
]);

export const genderEnum = pgEnum("gender_enum", [
  "male",
  "female",
  "other",
  "unknown",
]);

export const positionStatusEnum = pgEnum("position_status_enum", [
  "draft",
  "pending_approval",
  "open",
  "frozen",
  "closed",
]);

export const jobCategoryEnum = pgEnum("job_category_enum", [
  "manager",
  "high_level_technical",
  "mid_level_technical",
  "other",
]);

export const allowanceTypeEnum = pgEnum("allowance_type_enum", [
  "position",
  "salary",
  "seniority",
  "professional_seniority",
  "additional",
]);

export const socialInsuranceStatusEnum = pgEnum("social_insurance_status_enum", [
  "pending",
  "active",
  "paused",
  "terminated",
]);
