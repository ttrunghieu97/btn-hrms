import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { PermissionRegistry } from "@project/permissions";
import { Permissions } from "../../core/security/permissions/permissions.registry";
import { loadEnv } from "./env";
import {
  permissions,
  roles,
  rolePermissions,
  userRoles,
  users,
  departments,
  branches,
  locations,
  companies,
  positions,
  employees,
  employmentRecords,
  orgAssignments,
  employeeContracts,
  salaryStructures,
  shiftTemplates,
  workRoles,
  leavePolicies,
  leaveTypes,
  leavePolicyAssignments,
  leaveBalances,
  approvalPolicies,
  performanceCycles,
  goals,
  goalAssignments,
  reviewAssignments,
  payrollCalculationVersions,
  payrollPeriods,
  attendanceDailySummaries,
  boardingTemplates,
  boardingTemplateItems,
  boardingProcesses,
  boardingChecklistItems,
  taskTemplates,
  tasks,
} from "./schema";
import { sql } from "drizzle-orm";

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "123456";

function encryptPii(plaintext: string): string {
  const rawKey =
    process.env.PII_ENCRYPTION_KEY_V1 ||
    process.env.PII_ENCRYPTION_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const key = Buffer.from(rawKey.padEnd(32, "0").slice(0, 32), "utf-8");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `v1:${Buffer.concat([iv, authTag, encrypted]).toString("hex")}`;
}

// ─── Data definitions ───────────────────────────────────────────────────────

const BASE_PERMISSIONS = [
  { code: "sys:all", description: "Toàn quyền hệ thống" },
  { code: "dashboard:view", description: "Xem tổng quan hệ thống" },
  { code: "users:view", description: "Xem danh sách tài khoản" },
  { code: "users:create", description: "Tạo tài khoản" },
  { code: "users:edit", description: "Chỉnh sửa tài khoản" },
  { code: "users:delete", description: "Xóa tài khoản" },
  { code: "departments:view", description: "Xem danh sách phòng ban" },
  { code: "departments:create", description: "Tạo phòng ban" },
  { code: "departments:edit", description: "Chỉnh sửa phòng ban" },
  { code: "departments:delete", description: "Xóa phòng ban" },
  { code: "employees:view", description: "Xem hồ sơ nhân viên" },
  { code: "employees:view:self", description: "Xem hồ sơ của bản thân" },
  { code: "employees:view:department", description: "Xem hồ sơ trong phòng ban" },
  { code: "employees:view:all", description: "Xem hồ sơ toàn công ty" },
  { code: "employees:create", description: "Tạo hồ sơ nhân viên" },
  { code: "employees:edit", description: "Chỉnh sửa hồ sơ nhân viên" },
  { code: "employees:update:self", description: "Cập nhật thông tin của bản thân" },
  { code: "employees:update:all", description: "Cập nhật hồ sơ toàn công ty" },
  { code: "employees:manage:sensitive", description: "Quản lý dữ liệu nhạy cảm của nhân viên" },
  { code: "employees:reset-password", description: "Reset mật khẩu nhân viên" },
  { code: "employees:delete", description: "Xóa hồ sơ nhân viên" },
  { code: "profile:view", description: "Xem trang cá nhân" },
  { code: "schedule:view:self", description: "Xem lịch làm việc của bản thân" },
  { code: "schedule:view:department", description: "Xem lịch làm việc trong phòng ban" },
  { code: "schedule:view:all", description: "Xem lịch làm việc toàn công ty" },
  { code: "schedule:edit:self", description: "Chỉnh sửa lịch làm việc của bản thân" },
  { code: "schedule:edit:department", description: "Chỉnh sửa lịch làm việc trong phòng ban" },
  { code: "schedule:edit:all", description: "Chỉnh sửa lịch làm việc toàn công ty" },
  { code: "attendance:check", description: "Chấm công (check-in/out)" },
  { code: "attendance:view:self", description: "Xem chấm công của bản thân" },
  { code: "attendance:view:department", description: "Xem chấm công trong phòng ban" },
  { code: "attendance:view:all", description: "Xem chấm công toàn công ty" },
  { code: "attendance:report", description: "Xem báo cáo chấm công" },
  { code: "attendance:overtime:submit", description: "Gửi yêu cầu làm thêm giờ" },
  { code: "attendance:overtime:approve", description: "Phê duyệt yêu cầu làm thêm giờ" },
  { code: "attendance:timesheet:view", description: "Xem bảng chấm công" },
  { code: "attendance:timesheet:manage", description: "Quản lý bảng chấm công (nhập/sửa)" },
  { code: "attendance:timesheet:approve", description: "Phê duyệt bảng chấm công" },
  { code: "attendance:timesheet:import", description: "Nhập dữ liệu bảng chấm công" },
  { code: "attendance:period:view", description: "Xem trạng thái kỳ chấm công" },
  { code: "attendance:period:review", description: "Gửi kỳ chấm công vào quy trình duyệt" },
  { code: "attendance:period:approve", description: "Phê duyệt kỳ chấm công" },
  { code: "attendance:period:lock", description: "Khóa kỳ chấm công" },
  { code: "attendance:period:unlock", description: "Mở khóa kỳ chấm công" },
  { code: "attendance:period:close", description: "Đóng kỳ chấm công (không thể chỉnh sửa)" },
  { code: "gps-logs:view", description: "Xem nhật ký vị trí GPS" },
  { code: "gps-logs:submit", description: "Gửi nhật ký vị trí GPS" },
  { code: "leave:view:self", description: "Xem nghỉ phép của bản thân" },
  { code: "leave:view:department", description: "Xem nghỉ phép trong phòng ban" },
  { code: "leave:view:all", description: "Xem nghỉ phép toàn công ty" },
  { code: "leave:request", description: "Tạo đơn xin nghỉ" },
  { code: "leave:approve:department", description: "Phê duyệt nghỉ phép trong phòng ban" },
  { code: "leave:approve:all", description: "Phê duyệt nghỉ phép toàn công ty" },
  { code: "payroll:view:self", description: "Xem bảng lương của bản thân" },
  { code: "payroll:view:all", description: "Xem bảng lương toàn công ty" },
  { code: "payroll:edit", description: "Chỉnh sửa bảng lương" },
  { code: "payroll:manage_periods", description: "Quản lý kỳ lương" },
  { code: "payroll:manage_payslips", description: "Quản lý payslip" },
  { code: "reports:view", description: "Xem báo cáo" },
  { code: "reports:export", description: "Xuất báo cáo" },
  { code: "settings:view", description: "Xem cài đặt hệ thống" },
  { code: "settings:edit", description: "Chỉnh sửa cài đặt hệ thống" },
];

function buildCanonicalPermissions(): Array<{ code: string; description: string }> {
  const byCode = new Map<string, { code: string; description: string }>();
  for (const item of BASE_PERMISSIONS) {
    byCode.set(item.code, item);
  }
  const allRegistryCodes = [
    ...Object.values(PermissionRegistry).flatMap((domain) =>
      Object.values(domain as Record<string, string>),
    ),
    ...Object.values(Permissions),
  ];
  for (const code of allRegistryCodes) {
    if (!byCode.has(code)) {
      byCode.set(code, { code, description: `Quyền hệ thống (${code})` });
    }
  }
  return Array.from(byCode.values());
}

export const PERMISSIONS = buildCanonicalPermissions();

const EMPLOYEE_BASE_PERMISSIONS = [
  "schedule:view:self",
  "schedule:edit:self",
  "attendance:check",
  "attendance:view:self",
  "attendance:overtime:submit",
  "gps-logs:view",
  "gps-logs:submit",
  "leave:view:self",
  "leave:request",
  Permissions.LEAVE_CREATE,
  Permissions.LEAVE_EDIT,
  Permissions.LEAVE_BALANCE_VIEW,
  "payroll:view:self",
  "profile:view",
  PermissionRegistry.profile.edit,
  "employees:view:self",
  "employees:update:self",
  Permissions.EMPLOYEES_VIEW_SELF,
  Permissions.EMPLOYEES_UPDATE_SELF_LIMITED,
  "dashboard:view",
  Permissions.NOTIFICATIONS_VIEW_SELF,
  Permissions.PERFORMANCE_VIEW,
  Permissions.LEARNING_VIEW,
  Permissions.BENEFITS_VIEW,
  Permissions.EXPENSES_VIEW,
  Permissions.TASKS_VIEW_SELF,
  Permissions.ASSET_VIEW_SELF,
  Permissions.ASSET_REQUEST_CREATE,
  Permissions.CHAT_VIEW,
  Permissions.CHAT_SEND,
  Permissions.AUTH_CHANGE_PASSWORD,
];

export const SYSTEM_ROLES = [
  {
    code: "employee_base",
    name: "Nhân viên",
    description: "Vai trò mặc định cho nhân viên với quyền tự phục vụ.",
    type: "system",
    permissions: Array.from(new Set(EMPLOYEE_BASE_PERMISSIONS)),
  },
  {
    code: "department_manager",
    name: "Trưởng phòng",
    description: "Vai trò quản lý phòng ban, phê duyệt nghỉ phép, chấm công và công việc.",
    type: "system",
    permissions: Array.from(
      new Set([
        ...EMPLOYEE_BASE_PERMISSIONS,
        "employees:view:department",
        Permissions.EMPLOYEES_VIEW_DEPARTMENT,
        Permissions.DEPARTMENTS_VIEW,
        Permissions.SCHEDULE_VIEW_DEPARTMENT,
        Permissions.SCHEDULE_EDIT_DEPARTMENT,
        Permissions.ATTENDANCE_VIEW_DEPARTMENT,
        Permissions.ATTENDANCE_OVERTIME_APPROVE,
        Permissions.ATTENDANCE_TIMESHEET_VIEW,
        Permissions.ATTENDANCE_TIMESHEET_APPROVE,
        Permissions.LEAVE_VIEW,
        Permissions.LEAVE_VIEW_DEPARTMENT,
        Permissions.LEAVE_APPROVE,
        Permissions.LEAVE_APPROVE_DEPARTMENT,
        Permissions.APPROVAL_INBOX_VIEW,
        Permissions.APPROVAL_REQUESTS_VIEW,
        Permissions.APPROVAL_REQUESTS_DECIDE,
        Permissions.TASKS_VIEW,
        Permissions.TASKS_CREATE,
        Permissions.TASKS_EDIT,
        Permissions.TASKS_ASSIGN,
        Permissions.OFFBOARDING_CLEARANCE_MANAGER,
      ]),
    ),
  },
  {
    code: "system_admin",
    name: "System Admin",
    description: "Vai trò quản trị hệ thống cao nhất, có toàn quyền.",
    type: "system",
    permissions: ["sys:all"],
  },
];

const DEPARTMENTS = [
  { name: "BTN Holdings", description: "Tập đoàn", parent: null },
  { name: "Phòng Hành chính Nhân sự", description: "HR & Admin", parent: "BTN Holdings" },
  { name: "Phòng Công nghệ Thông tin", description: "IT Department", parent: "BTN Holdings" },
  { name: "Phòng Kinh doanh", description: "Sales Department", parent: "BTN Holdings" },
];

const POSITIONS = [
  { name: "Giám đốc" },
  { name: "Phó Giám đốc" },
  { name: "Trưởng phòng" },
  { name: "Phó phòng" },
  { name: "Tổ trưởng" },
  { name: "Nhân viên" },
  { name: "Bảo vệ" },
  { name: "Lái xe" },
  { name: "Kế toán trưởng" },
  { name: "Kế toán viên" },
  { name: "Kỹ sư" },
  { name: "Công nhân kỹ thuật" },
  { name: "Thủ kho" },
  { name: "Quản lý nhà hàng" },
  { name: "Kỹ thuật viên" },
  { name: "System Admin" },
];

// ─── Seed ───────────────────────────────────────────────────────────────────

async function seed() {
  loadEnv();
  const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing in .env");

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("Seeding permissions, personas, org data, and HRMS domain fixtures...");

  try {
    // 1. Permissions
    console.log("  1. Permissions...");
    await db.insert(permissions).values(PERMISSIONS).onConflictDoNothing();

    // 2. Roles
    console.log("  2. Roles...");
    const roleIdByCode = new Map<string, string>();
    for (const roleDef of SYSTEM_ROLES) {
      const existing = await db
        .select()
        .from(roles)
        .where(sql`${roles.code} = ${roleDef.code}`)
        .limit(1);

      let roleId: string;
      if (existing.length > 0) {
        roleId = existing[0]!.id;
        await db
          .update(roles)
          .set({ name: roleDef.name, description: roleDef.description })
          .where(sql`${roles.id} = ${roleId}`);
        await db
          .delete(rolePermissions)
          .where(sql`${rolePermissions.roleId} = ${roleId}`);
      } else {
        roleId = (
          await db
            .insert(roles)
            .values({
              code: roleDef.code,
              name: roleDef.name,
              description: roleDef.description,
              level: roleDef.code === "system_admin" ? 100 : roleDef.code === "department_manager" ? 50 : 10,
              type: roleDef.type,
              isSystem: true,
            })
            .returning()
        )[0]!.id;
      }
      roleIdByCode.set(roleDef.code, roleId);

      if (roleDef.permissions.length > 0) {
        await db
          .insert(rolePermissions)
          .values(roleDef.permissions.map((p) => ({ roleId, permissionCode: p })))
          .onConflictDoNothing();
      }
    }

    // 3. Company / Branch / Location
    console.log("  3. Company/Branch/Location...");
    const [company] = await db
      .insert(companies)
      .values({
        code: "BTN",
        name: "BTN Holdings",
        legalName: "Công ty Cổ phần Tập đoàn BTN Holdings",
        currency: "VND",
        timezone: "Asia/Ho_Chi_Minh",
        status: "active",
      })
      .onConflictDoNothing()
      .returning();
    const companyId =
      company?.id ??
      (await db.select().from(companies).where(sql`${companies.code} = 'BTN'`).limit(1))[0]!.id;

    const [branch] = await db
      .insert(branches)
      .values({ companyId, code: "HO", name: "Head Office", isHeadquarters: true })
      .onConflictDoNothing()
      .returning();
    const branchId =
      branch?.id ??
      (await db.select().from(branches).where(sql`${branches.code} = 'HO'`).limit(1))[0]!.id;

    const [loc] = await db
      .insert(locations)
      .values({ branchId, code: "HO-1", name: "Head Office", type: "office", isActive: true })
      .onConflictDoNothing()
      .returning();
    const locationId =
      loc?.id ??
      (await db.select().from(locations).where(sql`${locations.code} = 'HO-1'`).limit(1))[0]!.id;

    // 4. Departments
    console.log("  4. Departments...");
    const deptMap = new Map<string, string>();
    for (const d of DEPARTMENTS) {
      const parentId = d.parent ? deptMap.get(d.parent) : null;
      const existing = await db
        .select()
        .from(departments)
        .where(sql`${departments.name} = ${d.name}`)
        .limit(1);
      if (existing.length > 0) {
        deptMap.set(d.name, existing[0]!.id);
      } else {
        const [dept] = await db
          .insert(departments)
          .values({ branchId, name: d.name, description: d.description, parentId })
          .returning();
        deptMap.set(d.name, dept!.id);
      }
    }

    const hrDeptId = deptMap.get("Phòng Hành chính Nhân sự")!;
    const itDeptId = deptMap.get("Phòng Công nghệ Thông tin")!;

    // 5. Positions & Work Roles & Shift Templates
    console.log("  5. Positions & Shifts...");
    const positionMap = new Map<string, string>();
    for (const pos of POSITIONS) {
      const existing = await db
        .select()
        .from(positions)
        .where(sql`${positions.name} = ${pos.name}`)
        .limit(1);
      if (existing.length > 0) {
        positionMap.set(pos.name, existing[0]!.id);
      } else {
        const [createdPos] = await db
          .insert(positions)
          .values({ name: pos.name, isActive: true })
          .returning();
        positionMap.set(pos.name, createdPos!.id);
      }
    }

    await db
      .insert(workRoles)
      .values([
        { name: "Kỹ sư Phần mềm", isActive: true },
        { name: "Chuyên viên Nhân sự", isActive: true },
      ])
      .onConflictDoNothing();

    await db
      .insert(shiftTemplates)
      .values({
        branchId,
        locationId,
        code: "HC-01",
        name: "Ca Hành chính (08:00 - 17:00)",
        startTime: "08:00:00",
        endTime: "17:00:00",
        breakMinutes: 60,
        toleranceMinutes: 15,
        workDays: ["mon", "tue", "wed", "thu", "fri"],
        isNightShift: false,
        isActive: true,
      })
      .onConflictDoNothing();

    // 6. Seeded Users & Employees (admin, manager, employee, probation.emp)
    console.log("  6. Users & Employees...");
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    interface SeedPersona {
      username: string;
      email: string;
      isSuperAdmin: boolean;
      roleCodes: string[];
      employeeCode: string;
      firstName: string;
      lastName: string;
      departmentId: string;
      jobTitle: string;
      status: "working" | "probation";
      startDate: string;
      probationEndDate?: string;
      baseSalary: string;
      phoneNumber: string;
      address: string;
      identityNumber: string;
      bankAccountNumber: string;
      bankName: string;
      taxCode: string;
      emergencyContactName: string;
      emergencyContactPhone: string;
      contractNumber: string;
      contractType: "permanent" | "probationary";
      managerCode?: string;
    }

    const personas: SeedPersona[] = [
      {
        username: "admin",
        email: "admin@btn-hrms.com",
        isSuperAdmin: true,
        roleCodes: ["system_admin"],
        employeeCode: "EMP-ADMIN-01",
        firstName: "Quản trị",
        lastName: "Nguyễn",
        departmentId: hrDeptId,
        jobTitle: "Giám đốc Nhân sự",
        status: "working",
        startDate: "2024-01-15",
        baseSalary: "35000000",
        phoneNumber: "0901000001",
        address: "Số 1 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
        identityNumber: "079090000001",
        bankAccountNumber: "190300000001",
        bankName: "Techcombank",
        taxCode: "8000000001",
        emergencyContactName: "Nguyễn Thị Bình",
        emergencyContactPhone: "0909000001",
        contractNumber: "HDLD-2024-001",
        contractType: "permanent",
      },
      {
        username: "manager",
        email: "manager@btn-hrms.com",
        isSuperAdmin: false,
        roleCodes: ["employee_base", "department_manager"],
        employeeCode: "EMP-MGR-01",
        firstName: "Trưởng phòng",
        lastName: "Trần",
        departmentId: itDeptId,
        jobTitle: "Trưởng phòng CNTT",
        status: "working",
        startDate: "2024-03-01",
        baseSalary: "28000000",
        phoneNumber: "0901000002",
        address: "Số 2 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        identityNumber: "079090000002",
        bankAccountNumber: "190300000002",
        bankName: "Vietcombank",
        taxCode: "8000000002",
        emergencyContactName: "Trần Văn Nam",
        emergencyContactPhone: "0909000002",
        contractNumber: "HDLD-2024-002",
        contractType: "permanent",
      },
      {
        username: "employee",
        email: "employee@btn-hrms.com",
        isSuperAdmin: false,
        roleCodes: ["employee_base"],
        employeeCode: "EMP-STD-01",
        firstName: "Nhân viên",
        lastName: "Lê",
        departmentId: itDeptId,
        jobTitle: "Kỹ sư Phần mềm",
        status: "working",
        startDate: "2025-01-10",
        baseSalary: "18000000",
        phoneNumber: "0901000003",
        address: "Số 3 Hai Bà Trưng, Quận 3, TP. Hồ Chí Minh",
        identityNumber: "079090000003",
        bankAccountNumber: "190300000003",
        bankName: "ACB",
        taxCode: "8000000003",
        emergencyContactName: "Lê Thị Hoa",
        emergencyContactPhone: "0909000003",
        contractNumber: "HDLD-2025-003",
        contractType: "permanent",
        managerCode: "EMP-MGR-01",
      },
      {
        username: "probation.emp",
        email: "probation@btn-hrms.com",
        isSuperAdmin: false,
        roleCodes: ["employee_base"],
        employeeCode: "EMP-PROB-01",
        firstName: "Thử việc",
        lastName: "Phạm",
        departmentId: itDeptId,
        jobTitle: "Kỹ sư Kiểm thử",
        status: "probation",
        startDate: "2026-09-01",
        probationEndDate: "2026-11-30",
        baseSalary: "12000000",
        phoneNumber: "0901000004",
        address: "Số 4 Điện Biên Phủ, Quận Bình Thạnh, TP. Hồ Chí Minh",
        identityNumber: "079090000004",
        bankAccountNumber: "190300000004",
        bankName: "MBBank",
        taxCode: "8000000004",
        emergencyContactName: "Phạm Văn Hải",
        emergencyContactPhone: "0909000004",
        contractNumber: "HDTV-2026-004",
        contractType: "probationary",
        managerCode: "EMP-MGR-01",
      },
    ];

    const userIdByUsername = new Map<string, string>();
    const employeeIdByCode = new Map<string, string>();

    for (const p of personas) {
      const existingUser = await db
        .select()
        .from(users)
        .where(sql`${users.username} = ${p.username}`)
        .limit(1);

      let userId: string;
      if (existingUser.length > 0) {
        userId = existingUser[0]!.id;
        await db
          .update(users)
          .set({
            email: p.email,
            passwordHash,
            isSuperAdmin: p.isSuperAdmin,
            isActive: true,
          })
          .where(sql`${users.id} = ${userId}`);
      } else {
        const [createdUser] = await db
          .insert(users)
          .values({
            username: p.username,
            email: p.email,
            passwordHash,
            isSuperAdmin: p.isSuperAdmin,
            isActive: true,
          })
          .returning();
        userId = createdUser!.id;
      }
      userIdByUsername.set(p.username, userId);

      // Assign roles
      for (const rc of p.roleCodes) {
        const rId = roleIdByCode.get(rc);
        if (rId) {
          await db
            .insert(userRoles)
            .values({ userId, roleId: rId })
            .onConflictDoNothing();
        }
      }

      // Upsert employee profile
      const existingEmp = await db
        .select()
        .from(employees)
        .where(sql`${employees.userId} = ${userId} OR ${employees.employeeCode} = ${p.employeeCode}`)
        .limit(1);

      let empId: string;
      if (existingEmp.length > 0) {
        empId = existingEmp[0]!.id;
        await db
          .update(employees)
          .set({
            firstName: p.firstName,
            lastName: p.lastName,
            employeeCode: p.employeeCode,
            branchId,
            locationId,
            departmentId: p.departmentId,
            workEmail: p.email,
            personalEmail: `${p.username}.personal@example.com`,
            phoneNumber: p.phoneNumber,
            address: p.address,
            dob: "1995-05-15",
            gender: "male",
            startDate: p.startDate,
            status: p.status,
            probationEndDate: p.probationEndDate ?? null,
            identityNumber: encryptPii(p.identityNumber),
            identityDate: "2020-01-10",
            identityPlace: "Cục Cảnh sát QLHC về TTXH",
            bankAccountNumber: encryptPii(p.bankAccountNumber),
            bankName: p.bankName,
            taxCode: encryptPii(p.taxCode),
            emergencyContactName: encryptPii(p.emergencyContactName),
            emergencyContactPhone: encryptPii(p.emergencyContactPhone),
            highestEducationLevel: "bachelor",
            deletedAt: null,
          })
          .where(sql`${employees.id} = ${empId}`);
      } else {
        const [createdEmp] = await db
          .insert(employees)
          .values({
            userId,
            firstName: p.firstName,
            lastName: p.lastName,
            employeeCode: p.employeeCode,
            branchId,
            locationId,
            departmentId: p.departmentId,
            workEmail: p.email,
            personalEmail: `${p.username}.personal@example.com`,
            phoneNumber: p.phoneNumber,
            address: p.address,
            dob: "1995-05-15",
            gender: "male",
            startDate: p.startDate,
            status: p.status,
            probationEndDate: p.probationEndDate ?? null,
            identityNumber: encryptPii(p.identityNumber),
            identityDate: "2020-01-10",
            identityPlace: "Cục Cảnh sát QLHC về TTXH",
            bankAccountNumber: encryptPii(p.bankAccountNumber),
            bankName: p.bankName,
            taxCode: encryptPii(p.taxCode),
            emergencyContactName: encryptPii(p.emergencyContactName),
            emergencyContactPhone: encryptPii(p.emergencyContactPhone),
            highestEducationLevel: "bachelor",
          })
          .returning();
        empId = createdEmp!.id;
      }
      employeeIdByCode.set(p.employeeCode, empId);
    }

    // Link employmentRecords, orgAssignments, employeeContracts, salaryStructures
    for (const p of personas) {
      const empId = employeeIdByCode.get(p.employeeCode)!;
      const managerEmpId = p.managerCode ? (employeeIdByCode.get(p.managerCode) ?? null) : null;

      // Employment Record
      const existingEr = await db
        .select()
        .from(employmentRecords)
        .where(sql`${employmentRecords.employeeId} = ${empId} AND ${employmentRecords.isCurrent} = true`)
        .limit(1);
      let erId: string;
      if (existingEr.length > 0) {
        erId = existingEr[0]!.id;
        await db
          .update(employmentRecords)
          .set({ managerEmployeeId: managerEmpId, startDate: p.startDate })
          .where(sql`${employmentRecords.id} = ${erId}`);
      } else {
        const [createdEr] = await db
          .insert(employmentRecords)
          .values({
            employeeId: empId,
            startDate: p.startDate,
            managerEmployeeId: managerEmpId,
            isCurrent: true,
            note: "Hồ sơ công tác khởi tạo từ seed",
          })
          .returning();
        erId = createdEr!.id;
      }

      // Org Assignment
      const existingOa = await db
        .select()
        .from(orgAssignments)
        .where(
          sql`${orgAssignments.employeeId} = ${empId} AND ${orgAssignments.isCurrent} = true AND ${orgAssignments.assignmentType} = 'primary'`,
        )
        .limit(1);
      let oaId: string;
      if (existingOa.length > 0) {
        oaId = existingOa[0]!.id;
        await db
          .update(orgAssignments)
          .set({
            departmentId: p.departmentId,
            jobTitle: p.jobTitle,
            managerEmployeeId: managerEmpId,
            effectiveFrom: p.startDate,
          })
          .where(sql`${orgAssignments.id} = ${oaId}`);
      } else {
        const [createdOa] = await db
          .insert(orgAssignments)
          .values({
            employeeId: empId,
            departmentId: p.departmentId,
            jobTitle: p.jobTitle,
            assignmentType: "primary",
            managerEmployeeId: managerEmpId,
            effectiveFrom: p.startDate,
            isCurrent: true,
          })
          .returning();
        oaId = createdOa!.id;
      }

      // Employee Contract
      const existingContract = await db
        .select()
        .from(employeeContracts)
        .where(sql`${employeeContracts.employeeId} = ${empId} AND ${employeeContracts.isCurrent} = true`)
        .limit(1);
      if (existingContract.length === 0) {
        await db.insert(employeeContracts).values({
          employeeId: empId,
          employmentRecordId: erId,
          contractNumber: p.contractNumber,
          contractType: p.contractType,
          status: "active",
          version: 1,
          signedAt: p.startDate,
          effectiveFrom: p.startDate,
          effectiveTo: p.probationEndDate ?? null,
          isCurrent: true,
          note: "Hợp đồng lao động khởi tạo từ seed",
        });
      }

      // Salary Structure
      const existingSalary = await db
        .select()
        .from(salaryStructures)
        .where(sql`${salaryStructures.employeeId} = ${empId} AND ${salaryStructures.isCurrent} = true`)
        .limit(1);
      let ssId: string;
      if (existingSalary.length > 0) {
        ssId = existingSalary[0]!.id;
        await db
          .update(salaryStructures)
          .set({ baseSalary: p.baseSalary, effectiveFrom: p.startDate })
          .where(sql`${salaryStructures.id} = ${ssId}`);
      } else {
        const [createdSs] = await db
          .insert(salaryStructures)
          .values({
            employeeId: empId,
            currency: "VND",
            payFrequency: "monthly",
            baseSalary: p.baseSalary,
            effectiveFrom: p.startDate,
            isCurrent: true,
          })
          .returning();
        ssId = createdSs!.id;
      }

      await db
        .update(employees)
        .set({
          currentEmploymentRecordId: erId,
          currentOrgAssignmentId: oaId,
          currentSalaryStructureId: ssId,
        })
        .where(sql`${employees.id} = ${empId}`);
    }

    const adminUserId = userIdByUsername.get("admin")!;
    const managerUserId = userIdByUsername.get("manager")!;
    const empMgrId = employeeIdByCode.get("EMP-MGR-01")!;
    const empStdId = employeeIdByCode.get("EMP-STD-01")!;
    const empProbId = employeeIdByCode.get("EMP-PROB-01")!;

    // 7. Leave Policy, Leave Types, and Leave Balances
    console.log("  7. Leave Policy, Types & Balances...");
    const [lp] = await db
      .insert(leavePolicies)
      .values({
        branchId,
        code: "LP-DEFAULT",
        name: "Chính sách Nghỉ phép Tiêu chuẩn",
        description: "Chính sách nghỉ phép năm mặc định cho toàn công ty",
        effectiveFrom: "2024-01-01",
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();
    const leavePolicyId =
      lp?.id ??
      (await db.select().from(leavePolicies).where(sql`${leavePolicies.code} = 'LP-DEFAULT'`).limit(1))[0]!.id;

    await db
      .insert(leaveTypes)
      .values([
        {
          policyId: leavePolicyId,
          code: "AL",
          name: "Nghỉ phép năm (Annual Leave)",
          unit: "day",
          isPaid: true,
          requiresApproval: true,
          maxDaysPerYear: "12.00",
          minNoticeHours: 0,
          color: "#2563eb",
        },
        {
          policyId: leavePolicyId,
          code: "SL",
          name: "Nghỉ ốm (Sick Leave)",
          unit: "day",
          isPaid: true,
          requiresApproval: true,
          maxDaysPerYear: "10.00",
          minNoticeHours: 0,
          color: "#16a34a",
        },
      ])
      .onConflictDoNothing();

    const seededLeaveTypes = await db.select().from(leaveTypes);
    for (const empId of employeeIdByCode.values()) {
      const existingLpa = await db
        .select()
        .from(leavePolicyAssignments)
        .where(sql`${leavePolicyAssignments.employeeId} = ${empId} AND ${leavePolicyAssignments.effectiveTo} IS NULL`)
        .limit(1);
      if (existingLpa.length === 0) {
        await db.insert(leavePolicyAssignments).values({
          policyId: leavePolicyId,
          employeeId: empId,
          effectiveFrom: "2024-01-01",
        });
      }

      for (const lt of seededLeaveTypes) {
        await db
          .insert(leaveBalances)
          .values({
            employeeId: empId,
            leaveTypeId: lt.id,
            balanceYear: 2026,
            openingBalance: "12.00",
            accruedAmount: "12.00",
            usedAmount: "0.00",
            carriedOverAmount: "0.00",
            adjustedAmount: "0.00",
          })
          .onConflictDoNothing();
      }
    }

    // 8. Active Approval Policy for Leave Approval Engine
    console.log("  8. Approval Policies...");
    const existingAp = await db
      .select()
      .from(approvalPolicies)
      .where(sql`${approvalPolicies.key} = 'leave_approval' AND ${approvalPolicies.version} = 1`)
      .limit(1);
    const leaveApprovalSteps = {
      steps: [
        {
          stepIndex: 0,
          approverUserId: managerUserId,
          approverRole: "department_manager",
          label: "Quản lý trực tiếp phê duyệt",
        },
      ],
    };
    if (existingAp.length > 0) {
      await db
        .update(approvalPolicies)
        .set({
          name: "Quy trình Phê duyệt Nghỉ phép",
          description: "Phê duyệt nghỉ phép 1 bước bởi Trưởng phòng",
          steps: leaveApprovalSteps,
          isActive: true,
        })
        .where(sql`${approvalPolicies.id} = ${existingAp[0]!.id}`);
    } else {
      await db.insert(approvalPolicies).values({
        key: "leave_approval",
        version: 1,
        name: "Quy trình Phê duyệt Nghỉ phép",
        description: "Phê duyệt nghỉ phép 1 bước bởi Trưởng phòng",
        steps: leaveApprovalSteps,
        isActive: true,
      });
    }

    // 9. Performance Cycle, Goals & Review Assignments
    console.log("  9. Performance Cycles, Goals & Reviews...");
    const existingCycle = await db
      .select()
      .from(performanceCycles)
      .where(sql`${performanceCycles.name} = 'Chu kỳ Đánh giá Q4/2026'`)
      .limit(1);
    let cycleId: string;
    if (existingCycle.length > 0) {
      cycleId = existingCycle[0]!.id;
    } else {
      const [createdCycle] = await db
        .insert(performanceCycles)
        .values({
          name: "Chu kỳ Đánh giá Q4/2026",
          startsOn: "2026-10-01",
          endsOn: "2026-12-31",
          status: "self_review",
          createdByUserId: adminUserId,
          config: {
            selfReviewRequired: true,
            managerReviewRequired: true,
            calibrationRequired: false,
            approvalPolicyId: null,
            ratingScale: {
              type: "numeric_1_5",
              labels: {
                "1": "Chưa đạt",
                "2": "Cần cải thiện",
                "3": "Đạt yêu cầu",
                "4": "Vượt kỳ vọng",
                "5": "Xuất sắc",
              },
            },
            competencies: [
              { id: "comp-1", name: "Chất lượng công việc", description: "Độ chính xác và tin cậy" },
              { id: "comp-2", name: "Tinh thần hợp tác", description: "Phối hợp hiệu quả cùng đội ngũ" },
            ],
          },
        })
        .returning();
      cycleId = createdCycle!.id;
    }

    // Seed goals for employee and manager
    const existingEmpGoal = await db
      .select()
      .from(goals)
      .where(sql`${goals.cycleId} = ${cycleId} AND ${goals.title} = 'Hoàn thành mục tiêu cá nhân Q4 - Lê Nhân viên'`)
      .limit(1);
    let empGoalId: string;
    if (existingEmpGoal.length > 0) {
      empGoalId = existingEmpGoal[0]!.id;
    } else {
      const [g] = await db
        .insert(goals)
        .values({
          cycleId,
          title: "Hoàn thành mục tiêu cá nhân Q4 - Lê Nhân viên",
          description: "Đảm bảo tiến độ phát triển tính năng E2E HRMS",
          status: "approved",
        })
        .returning();
      empGoalId = g!.id;
    }
    await db
      .insert(goalAssignments)
      .values({ goalId: empGoalId, employeeId: empStdId, weight: "1.00" })
      .onConflictDoNothing();

    const existingMgrGoal = await db
      .select()
      .from(goals)
      .where(sql`${goals.cycleId} = ${cycleId} AND ${goals.title} = 'Mục tiêu Quản lý Phòng CNTT Q4 - Trần Trưởng phòng'`)
      .limit(1);
    let mgrGoalId: string;
    if (existingMgrGoal.length > 0) {
      mgrGoalId = existingMgrGoal[0]!.id;
    } else {
      const [g] = await db
        .insert(goals)
        .values({
          cycleId,
          title: "Mục tiêu Quản lý Phòng CNTT Q4 - Trần Trưởng phòng",
          description: "Nâng cao chất lượng vận hành hệ thống CNTT toàn tập đoàn",
          status: "approved",
        })
        .returning();
      mgrGoalId = g!.id;
    }
    await db
      .insert(goalAssignments)
      .values({ goalId: mgrGoalId, employeeId: empMgrId, weight: "1.00" })
      .onConflictDoNothing();

    // Seed review assignments (self-review for employee, self-review for manager)
    await db
      .insert(reviewAssignments)
      .values([
        {
          cycleId,
          employeeId: empStdId,
          reviewerId: empStdId,
          reviewType: "self",
          status: "pending",
          dueDate: "2026-12-15",
          overallComment: "Tự đánh giá Q4 của Lê Nhân viên",
        },
        {
          cycleId,
          employeeId: empMgrId,
          reviewerId: empMgrId,
          reviewType: "self",
          status: "pending",
          dueDate: "2026-12-15",
          overallComment: "Tự đánh giá Q4 của Trần Trưởng phòng",
        },
      ])
      .onConflictDoNothing();

    // 10. Payroll Calculation Version, Payroll Period & Attendance Daily Summaries
    console.log("  10. Payroll Period & Attendance Summaries...");
    await db
      .insert(payrollCalculationVersions)
      .values({
        code: "VN_PAYROLL_2026_V1",
        name: "Quy tắc Tính lương Tiêu chuẩn 2026",
        description: "Phiên bản quy tắc tính lương mặc định năm 2026",
        status: "active",
        effectiveFrom: "2026-01-01",
        createdByUserId: adminUserId,
      })
      .onConflictDoNothing();

    await db
      .insert(payrollPeriods)
      .values({
        code: "PP-2026-10",
        name: "Kỳ lương Tháng 10/2026",
        startsOn: "2026-10-01",
        endsOn: "2026-10-31",
        payDate: "2026-11-05",
        status: "draft",
      })
      .onConflictDoNothing();

    const sampleWorkDates = ["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-07"];
    for (const workDate of sampleWorkDates) {
      for (const empId of [empMgrId, empStdId]) {
        await db
          .insert(attendanceDailySummaries)
          .values({
            employeeId: empId,
            workDate,
            status: "present",
            scheduledMinutes: 480,
            workedMinutes: 480,
            breakMinutes: 60,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeMinutes: 0,
          })
          .onConflictDoNothing();
      }
    }

    // 11. Onboarding Template & Active Process
    console.log("  11. Onboarding Template & Process...");
    const existingObTemplate = await db
      .select()
      .from(boardingTemplates)
      .where(sql`${boardingTemplates.name} = 'Quy trình Hội nhập Nhân sự Mới'`)
      .limit(1);
    let obTemplateId: string;
    if (existingObTemplate.length > 0) {
      obTemplateId = existingObTemplate[0]!.id;
    } else {
      const [createdTpl] = await db
        .insert(boardingTemplates)
        .values({
          name: "Quy trình Hội nhập Nhân sự Mới",
          type: "onboarding",
          departmentId: itDeptId,
          isDefault: true,
          isActive: true,
        })
        .returning();
      obTemplateId = createdTpl!.id;

      await db.insert(boardingTemplateItems).values([
        {
          templateId: obTemplateId,
          title: "Cấp phát tài khoản Email & Hệ thống HRMS",
          description: "Thiết lập tài khoản công ty và phân quyền cơ bản",
          category: "IT",
          assigneeType: "hr",
          defaultAssigneeUserId: adminUserId,
          dueDaysOffset: 1,
          isMandatory: true,
          sortOrder: 1,
        },
        {
          templateId: obTemplateId,
          title: "Giới thiệu quy chế làm việc và văn hóa BTN",
          description: "Hướng dẫn nội quy, chấm công và nghỉ phép",
          category: "HR",
          assigneeType: "employee",
          dueDaysOffset: 3,
          isMandatory: true,
          sortOrder: 2,
        },
      ]);
    }

    const existingObProcess = await db
      .select()
      .from(boardingProcesses)
      .where(sql`${boardingProcesses.employeeId} = ${empProbId} AND ${boardingProcesses.type} = 'onboarding'`)
      .limit(1);
    if (existingObProcess.length === 0) {
      const [createdProc] = await db
        .insert(boardingProcesses)
        .values({
          employeeId: empProbId,
          templateId: obTemplateId,
          type: "onboarding",
          status: "in_progress",
          startDate: "2026-09-01",
          targetEndDate: "2026-11-30",
          assignedHrUserId: adminUserId,
        })
        .returning();

      await db.insert(boardingChecklistItems).values([
        {
          processId: createdProc!.id,
          title: "Cấp phát tài khoản Email & Hệ thống HRMS",
          dueDaysOffset: 1,
          mandatory: true,
          assigneeUserId: adminUserId,
          status: "pending",
          dueDate: "2026-09-05",
          isCompleted: false,
        },
        {
          processId: createdProc!.id,
          title: "Giới thiệu quy chế làm việc và văn hóa BTN",
          dueDaysOffset: 3,
          mandatory: true,
          assigneeUserId: userIdByUsername.get("probation.emp")!,
          status: "pending",
          dueDate: "2026-09-10",
          isCompleted: false,
        },
      ]);
    }

    // 12. Task Templates & Tasks
    console.log("  12. Task Templates & Tasks...");
    const existingTaskTpl = await db
      .select()
      .from(taskTemplates)
      .where(sql`${taskTemplates.title} = 'Mẫu Bàn giao Thiết bị Làm việc'`)
      .limit(1);
    let taskTplId: string;
    if (existingTaskTpl.length > 0) {
      taskTplId = existingTaskTpl[0]!.id;
    } else {
      const [createdTaskTpl] = await db
        .insert(taskTemplates)
        .values({
          title: "Mẫu Bàn giao Thiết bị Làm việc",
          description: "Quy trình chuẩn bị và bàn giao máy tính cho nhân sự mới",
          checklist: [
            { title: "Cài đặt hệ điều hành và phần mềm bảo mật", completed: false },
            { title: "Ký biên bản bàn giao tài sản", completed: false },
          ],
          priority: "high",
          defaultAssigneeId: empStdId,
          departmentId: itDeptId,
          isActive: true,
          createdByUserId: adminUserId,
        })
        .returning();
      taskTplId = createdTaskTpl!.id;
    }

    const existingSeededTask = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.title} = 'Hoàn thành cập nhật hồ sơ nhân sự Q4'`)
      .limit(1);
    if (existingSeededTask.length === 0) {
      await db.insert(tasks).values({
        title: "Hoàn thành cập nhật hồ sơ nhân sự Q4",
        description: "Kiểm tra và xác nhận thông tin liên hệ khẩn cấp trên hệ thống HRMS",
        status: "assigned",
        progress: "0",
        assigneeId: empStdId,
        createdByUserId: adminUserId,
        templateId: taskTplId,
        priority: "high",
        dueDate: new Date("2026-11-15T10:00:00Z"),
      });
    }

    // 13. Ensure all non-superadmin users have at least employee_base role
    const empRoleId = roleIdByCode.get("employee_base");
    if (empRoleId) {
      const nonAdmins = await db
        .select()
        .from(users)
        .where(sql`${users.isSuperAdmin} = false`);
      for (const u of nonAdmins) {
        await db
          .insert(userRoles)
          .values({ userId: u.id, roleId: empRoleId })
          .onConflictDoNothing();
      }
    }

    console.log(
      `\nDone. Seeded personas (password: ${DEFAULT_PASSWORD}):\n` +
        `  - admin (HR / System Admin, EMP-ADMIN-01)\n` +
        `  - manager (Department Manager, EMP-MGR-01)\n` +
        `  - employee (Standard Employee, EMP-STD-01)\n` +
        `  - probation.emp (Probation Employee, EMP-PROB-01)`,
    );
  } catch (error) {
    console.error("\nSeed error:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
    process.exit(process.exitCode);
  }
}

if (require.main === module) {
  void seed();
}
