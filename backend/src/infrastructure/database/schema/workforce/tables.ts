import {
  jobCategoryEnum,
  allowanceTypeEnum,
  socialInsuranceStatusEnum,
} from "./enums";

import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  contractStatusEnum,
  educationLevelEnum,
  contractTypeEnum,
  employeeStatusEnum,
  genderEnum,
  orgAssignmentTypeEnum,
} from "./enums";
import {
  branches,
  departments,
  locations,
} from "../org/tables";
import { users } from "../identity/tables";
import { salaryStructures } from "../payroll/tables";
import { payFrequencyEnum } from "../payroll/enums";
import { files } from "../_shared/files";

// 6. Employees: HR-specific profile data (1:1 with User)
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),

    employeeCode: text("employee_code").notNull().unique(),

    avatarFileId: uuid("avatar_file_id"),

    dob: date("dob"),
    gender: genderEnum("gender").default("unknown"),
    parentBranchId: uuid("parent_branch_id"),
    address: text("address"),
    phoneNumber: text("phone_number"),
    personalEmail: text("personal_email"),
    workEmail: text("work_email"),


    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),

    locationId: uuid("location_id").references(
      () => locations.id,
      {
        onDelete: "set null",
      },
    ),

    currentEmploymentRecordId: uuid("current_employment_record_id").references(
      (): any => employmentRecords.id,
      {
        onDelete: "set null",
      },
    ),
    currentOrgAssignmentId: uuid("current_org_assignment_id").references(
      (): any => orgAssignments.id,
      {
        onDelete: "set null",
      },
    ),
    currentSalaryStructureId: uuid("current_salary_structure_id").references(
      (): any => salaryStructures.id,
      {
        onDelete: "set null",
      },
    ),

    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),

    startDate: date("start_date"),
    endDate: date("end_date"),
    lastWorkingDate: date("last_working_date"),

    version: integer("version").default(1).notNull(),

    status: employeeStatusEnum("status").default("working").notNull(),
    probationEndDate: date("probation_end_date"),

    identityNumber: text("identity_number"),
    identityDate: date("identity_date"),
    identityPlace: text("identity_place"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    bankAccountNumber: text("bank_account_number"),
    bankName: text("bank_name"),
    taxCode: text("tax_code"),
    highestEducationLevel: educationLevelEnum("highest_education_level"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqEmployeesUserId: unique("uq_employees_user_id").on(table.userId),

    idxUser: index("idx_employees_user_id").on(table.userId),

    idxDepartment: index("idx_employees_department_id").on(table.departmentId),


    idxBranch: index("idx_employees_branch_id").on(table.branchId),

    idxLocation: index("idx_employees_location_id").on(
      table.locationId,
    ),
    idxCurrentEmploymentRecord: index(
      "idx_employees_current_employment_record_id",
    ).on(table.currentEmploymentRecordId),
    idxCurrentOrgAssignment: index(
      "idx_employees_current_org_assignment_id",
    ).on(table.currentOrgAssignmentId),
    idxCurrentSalaryStructure: index(
      "idx_employees_current_salary_structure_id",
    ).on(table.currentSalaryStructureId),

    idxEmployeeCode: index("idx_employees_employee_code").on(
      table.employeeCode,
    ),
    idxName: index("idx_employees_name").on(table.firstName, table.lastName),
    idxIdentityNumber: index("idx_employees_identity_number").on(
      table.identityNumber,
    ),
    idxDeletedAt: index("idx_employees_deleted_at").on(table.deletedAt),
    uqWorkEmail: uniqueIndex("uq_employees_work_email")
      .on(table.workEmail)
      .where(sql`${table.workEmail} is not null`),
    uqPersonalEmail: uniqueIndex("uq_employees_personal_email")
      .on(table.personalEmail)
      .where(sql`${table.personalEmail} is not null`),
    chkDateRange: check(
      "chk_employees_date_range",
      sql`${table.endDate} is null or ${table.startDate} is null or ${table.startDate} <= ${table.endDate}`,
    ),
  }),
);

// 5a. Employee Status History
export const employeeStatusHistory = pgTable(
  "employee_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    status: employeeStatusEnum("status").notNull(),
    notes: text("notes"),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    changedBy: uuid("changed_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    idxEmployee: index("idx_employee_status_history_employee_id").on(
      table.employeeId,
    ),
    idxChangedBy: index("idx_employee_status_history_changed_by").on(
      table.changedBy,
    ),
  }),
);

// 5b. Employment Records: normalized employment lifecycle data
export const employmentRecords = pgTable(
  "employment_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    startDate: date("start_date").notNull(),
    endDate: date("end_date"),

    managerEmployeeId: uuid("manager_employee_id").references(
      (): any => employees.id,
      {
        onDelete: "set null",
      },
    ),

    note: text("note"),
    isCurrent: boolean("is_current").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_employment_records_employee_id").on(
      table.employeeId,
    ),

    idxManager: index("idx_employment_records_manager_employee_id").on(
      table.managerEmployeeId,
    ),
    idxCurrent: index("idx_employment_records_is_current").on(table.isCurrent),
    uqCurrentEmployee: uniqueIndex("uq_employment_records_current_employee")
      .on(table.employeeId)
      .where(sql`${table.isCurrent} = true`),
    chkDateRange: check(
      "chk_employment_records_date_range",
      sql`${table.endDate} is null or ${table.startDate} <= ${table.endDate}`,
    ),
  }),
);

// 5c. Employee Contracts: versioned legal contract records
export const employeeContracts = pgTable(
  "employee_contracts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    employmentRecordId: uuid("employment_record_id").references(
      () => employmentRecords.id,
      { onDelete: "set null" },
    ),

    contractNumber: text("contract_number"),
    contractType: contractTypeEnum("contract_type")
      .default("permanent")
      .notNull(),
    status: contractStatusEnum("status").default("active").notNull(),
    version: integer("version").default(1).notNull(),

    signedAt: date("signed_at"),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),

    fileUrl: text("file_url"),
    note: text("note"),
    previousContractId: uuid("previous_contract_id"),
    isCurrent: boolean("is_current").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_employee_contracts_employee_id").on(
      table.employeeId,
    ),
    idxEmploymentRecord: index(
      "idx_employee_contracts_employment_record_id",
    ).on(table.employmentRecordId),
    idxCurrent: index("idx_employee_contracts_is_current").on(table.isCurrent),
    uqCurrentEmployee: uniqueIndex("uq_employee_contracts_current_employee")
      .on(table.employeeId)
      .where(sql`${table.isCurrent} = true`),
    uqEmployeeVersion: unique("uq_employee_contracts_employee_version").on(
      table.employeeId,
      table.version,
    ),
    chkDateRange: check(
      "chk_employee_contracts_date_range",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} <= ${table.effectiveTo}`,
    ),
  }),
);

// 5d. Org Assignments: versioned org structure assignments
export const orgAssignments = pgTable(
  "org_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),

    jobTitle: text("job_title"),
    assignmentType: orgAssignmentTypeEnum("assignment_type")
      .default("primary")
      .notNull(),

    managerEmployeeId: uuid("manager_employee_id").references(
      (): any => employees.id,
      {
        onDelete: "set null",
      },
    ),

    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),

    isCurrent: boolean("is_current").default(true).notNull(),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_org_assignments_employee_id").on(table.employeeId),
    idxDepartment: index("idx_org_assignments_department_id").on(
      table.departmentId,
    ),
    idxManager: index("idx_org_assignments_manager_employee_id").on(
      table.managerEmployeeId,
    ),
    idxCurrent: index("idx_org_assignments_is_current").on(table.isCurrent),
    uqCurrentPrimaryAssignment: uniqueIndex(
      "uq_org_assignments_current_employee",
    )
      .on(table.employeeId)
      .where(
        sql`${table.isCurrent} = true and ${table.assignmentType} = 'primary'`,
      ),
    chkDateRange: check(
      "chk_org_assignments_date_range",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} <= ${table.effectiveTo}`,
    ),
  }),
);

// 6. Employee Documents
export const employeeDocuments = pgTable(
  "employee_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),

    documentType: text("document_type").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_employee_documents_employee_id").on(
      table.employeeId,
    ),
    idxFile: index("idx_employee_documents_file_id").on(
      table.fileId,
    ),
    idxDocumentActive: index("idx_employee_documents_document_active").on(
      table.employeeId,
      table.documentType,
      table.isActive,
    ),
    uqActiveDocumentType: uniqueIndex("uq_employee_documents_active_type")
      .on(table.employeeId, table.documentType)
      .where(sql`${table.isActive} = true`),
  }),
);

// 8. Employee Education (degrees, diplomas)
export const employeeEducations = pgTable(
  "employee_educations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    educationLevel: educationLevelEnum("education_level").notNull(),
    educationName: text("education_name"),
    major: text("major"),
    institution: text("institution"),
    graduationYear: integer("graduation_year"),
    gpa: numeric("gpa", { precision: 4, scale: 2 }),
    documentId: uuid("document_id").references(() => files.id, {
      onDelete: "set null",
    }),
    verified: boolean("verified").default(false).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxEmployee: index("idx_employee_educations_employee_id").on(table.employeeId),
    idxInstitution: index("idx_employee_educations_institution").on(table.institution),
    idxLevel: index("idx_employee_educations_level").on(table.educationLevel),
  }),
);

// 7. Certifications

export const certifications = pgTable(
  "certifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    image: text("image"),
    fileId: uuid("file_id").references(() => files.id, {
      onDelete: "set null",
    }),

    issuedBy: text("issued_by").notNull(),
    issuedDate: date("issued_date").notNull(),
    expiredDate: date("expired_date"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_certifications_employee_id").on(table.employeeId),
    idxFile: index("idx_certifications_file_id").on(
      table.fileId,
    ),
  }),
);

export const positions = pgTable(
  "positions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    jobCategory: jobCategoryEnum("job_category").default("other").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxName: index("idx_positions_name").on(table.name),
  }),
);

export const jobAssignments = pgTable("job_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  positionId: uuid("position_id")
    .notNull()
    .references(() => positions.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isPrimary: boolean("is_primary").default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  idxEmployee: index("idx_job_assignments_employee_id").on(table.employeeId),
  idxPosition: index("idx_job_assignments_position_id").on(table.positionId),
}));

export const employeeCompensations = pgTable("employee_compensations", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  jobAssignmentId: uuid("job_assignment_id").references(
    () => jobAssignments.id,
  ),
  payType: varchar("pay_type", { length: 50 }).notNull(), // 'salary', 'hourly', 'daily'
  baseAmount: numeric("base_amount", { precision: 12, scale: 2 }).notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  payFrequency: payFrequencyEnum("pay_frequency"),
  effectiveStartDate: date("effective_start_date").notNull(),
  effectiveEndDate: date("effective_end_date"),
  changeReason: varchar("change_reason", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  idxEmployee: index("idx_employee_compensations_employee_id").on(table.employeeId),
  idxJobAssignment: index("idx_employee_compensations_job_assignment_id").on(table.jobAssignmentId),
}));

export const employeeIdentifiers = pgTable("employee_identifiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  identifierType: varchar("identifier_type", { length: 50 }).notNull(),
  identifierValue: varchar("identifier_value", { length: 255 }).notNull(),
  issuingCountry: varchar("issuing_country", { length: 2 }),
  issuedDate: date("issued_date"),
  expiryDate: date("expiry_date"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  idxEmployee: index("idx_employee_identifiers_employee_id").on(table.employeeId),
  idxIdentifier: index("idx_employee_identifiers_value").on(table.identifierValue),
}));

// 10. Allowances
export const allowances = pgTable(
  "allowances",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    type: allowanceTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),

    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),

    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_allowances_employee_id").on(table.employeeId),
    idxType: index("idx_allowances_type").on(table.type),
    idxEffective: index("idx_allowances_effective").on(table.effectiveFrom, table.effectiveTo),
  }),
);

// 11. Social Insurance Enrollments
export const socialInsuranceEnrollments = pgTable(
  "social_insurance_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    insuranceNumber: text("insurance_number").notNull(),

    startDate: date("start_date").notNull(),
    endDate: date("end_date"),

    status: socialInsuranceStatusEnum("status").default("active").notNull(),
    reason: text("reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxEmployee: index("idx_social_insurance_enrollments_employee_id").on(table.employeeId),
    idxStatus: index("idx_social_insurance_enrollments_status").on(table.status),
  }),
);
