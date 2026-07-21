import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
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
} from "./schema";
import { sql } from "drizzle-orm";

loadEnv();

const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing in .env");

const client = postgres(connectionString);
const db = drizzle(client);

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? crypto.randomBytes(16).toString("hex");

// ─── Data definitions ───────────────────────────────────────────────────────

const PERMISSIONS = [
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
  { code: "schedule:view:self", description: "Xem lịch làm việc của bản thân" },
  { code: "schedule:view:department", description: "Xem lịch làm việc trong phòng ban" },
  { code: "schedule:view:all", description: "Xem lịch làm việc toàn công ty" },
  { code: "schedule:edit:self", description: "Chỉnh sửa lịch làm việc của bản thân" },
  { code: "schedule:edit:department", description: "Chỉnh sửa lịch làm việc trong phòng ban" },
  { code: "attendance:view:self", description: "Xem chấm công của bản thân" },
  { code: "attendance:view:department", description: "Xem chấm công trong phòng ban" },
  { code: "attendance:view:all", description: "Xem chấm công toàn công ty" },
  { code: "attendance:edit:self", description: "Chỉnh sửa chấm công của bản thân" },
  { code: "attendance:edit:department", description: "Chỉnh sửa chấm công trong phòng ban" },
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

export const SYSTEM_ROLES = [
  {
    code: "employee_base",
    name: "Nhân viên",
    description: "Vai trò mặc định cho nhân viên với quyền tự phục vụ.",
    type: "system",
    permissions: [
      "schedule:view:self", "attendance:view:self", "attendance:edit:self",
      "leave:view:self", "leave:request", "payroll:view:self",
    ],
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
  console.log("Seeding permissions, admin user, org data...");

  try {
    // 1. Permissions
    console.log("  Permissions...");
    await db.insert(permissions).values(PERMISSIONS).onConflictDoNothing();

    // 2. Roles
    console.log("  Roles...");
    for (const roleDef of SYSTEM_ROLES) {
      const existing = await db
        .select()
        .from(roles)
        .where(sql`${roles.code} = ${roleDef.code}`)
        .limit(1);

      let roleId: string;
      if (existing.length > 0) {
        roleId = existing[0]!.id;
        await db.update(roles)
          .set({ name: roleDef.name, description: roleDef.description })
          .where(sql`${roles.id} = ${roleId}`);
        await db.delete(rolePermissions)
          .where(sql`${rolePermissions.roleId} = ${roleId}`);
      } else {
        roleId = (
          await db.insert(roles).values({
            code: roleDef.code,
            name: roleDef.name,
            description: roleDef.description,
            level: 10,
            type: roleDef.type,
            isSystem: true,
          }).returning()
        )[0]!.id;
      }

      if (roleDef.permissions.length > 0) {
        await db
          .insert(rolePermissions)
          .values(roleDef.permissions.map((p) => ({ roleId, permissionCode: p })))
          .onConflictDoNothing();
      }
    }

    // 3. Company / Branch / Location (required by FK constraints)
    console.log("  Company/Branch/Location...");
    const [company] = await db
      .insert(companies)
      .values({ code: "BTN", name: "BTN Holdings", legalName: "BTN Holdings", currency: "VND", timezone: "Asia/Ho_Chi_Minh", status: "active" })
      .onConflictDoNothing()
      .returning();
    const companyId = company?.id ?? (await db.select().from(companies).where(sql`${companies.code} = 'BTN'`).limit(1))[0]!.id;

    const [branch] = await db
      .insert(branches)
      .values({ companyId, code: "HO", name: "Head Office", isHeadquarters: true })
      .onConflictDoNothing()
      .returning();
    const branchId = branch?.id ?? (await db.select().from(branches).where(sql`${branches.code} = 'HO'`).limit(1))[0]!.id;

    await db
      .insert(locations)
      .values({ branchId, code: "HO-1", name: "Head Office", type: "office", isActive: true })
      .onConflictDoNothing();

    // 4. Departments
    console.log("  Departments...");
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

    // 5. Positions
    console.log("  Positions...");
    for (const pos of POSITIONS) {
      const existing = await db
        .select()
        .from(positions)
        .where(sql`${positions.name} = ${pos.name}`)
        .limit(1);
      if (existing.length === 0) {
        await db.insert(positions).values({ name: pos.name, isActive: true });
      }
    }

    // 6. Admin user
    console.log("  Admin user...");
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const existingAdmin = await db
      .select()
      .from(users)
      .where(sql`${users.username} = 'admin'`)
      .limit(1);

    let adminId: string;
    if (existingAdmin.length > 0) {
      adminId = existingAdmin[0]!.id;
      console.log("  Admin exists, skipping.");
    } else {
      adminId = (
        await db.insert(users).values({
          username: "admin",
          email: "admin@btn-hrms.com",
          passwordHash,
          isSuperAdmin: true,
          isActive: true,
        }).returning()
      )[0]!.id;
      console.log("  Admin created.");
    }

    // Assign system_admin role
    const sysAdminRole = await db
      .select()
      .from(roles)
      .where(sql`${roles.code} = 'system_admin'`)
      .limit(1);
    if (sysAdminRole.length > 0) {
      const exists = await db
        .select()
        .from(userRoles)
        .where(sql`${userRoles.userId} = ${adminId} AND ${userRoles.roleId} = ${sysAdminRole[0]!.id}`)
        .limit(1);
      if (exists.length === 0) {
        await db.insert(userRoles).values({ userId: adminId, roleId: sysAdminRole[0]!.id });
      }
    }

    console.log(`\nDone. Login: admin / ${DEFAULT_PASSWORD}`);
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
