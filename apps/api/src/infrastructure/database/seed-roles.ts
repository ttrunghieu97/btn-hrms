import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnv } from "./env";
import {
  permissions as permissionsTable,
  roles as rolesTable,
  rolePermissions as rolePermissionsTable,
} from "./schema";
import { sql } from "drizzle-orm";

loadEnv();

const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing in .env");

const client = postgres(connectionString);
const db = drizzle(client);

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

const SYSTEM_ROLES = [
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

async function seedRoles() {
  console.log("Seeding permissions & roles...");

  try {
    // 1. Permissions
    console.log("  Permissions...");
    await db.insert(permissionsTable).values(PERMISSIONS).onConflictDoNothing();

    // 2. Roles + role permissions
    console.log("  Roles...");
    const allowedCodes = SYSTEM_ROLES.map((r) => r.code);

    // Remove roles that are no longer in SYSTEM_ROLES
    const existingRoles = await db.select().from(rolesTable)
      .where(sql`${rolesTable.code} NOT IN (${sql.join(allowedCodes.map((c) => sql`${c}`), sql`, `)})`);
    for (const stale of existingRoles) {
      await db.delete(rolePermissionsTable).where(sql`${rolePermissionsTable.roleId} = ${stale.id}`);
      await db.delete(rolesTable).where(sql`${rolesTable.id} = ${stale.id}`);
      console.log(`    removed ${stale.code}`);
    }

    for (const roleDef of SYSTEM_ROLES) {
      const existing = await db
        .select()
        .from(rolesTable)
        .where(sql`${rolesTable.code} = ${roleDef.code}`)
        .limit(1);

      let roleId: string;
      if (existing.length > 0) {
        roleId = existing[0]!.id;
        // Update name/description and sync permissions
        await db.update(rolesTable)
          .set({ name: roleDef.name, description: roleDef.description })
          .where(sql`${rolesTable.id} = ${roleId}`);
        // Delete old permissions, insert current ones
        await db.delete(rolePermissionsTable)
          .where(sql`${rolePermissionsTable.roleId} = ${roleId}`);
      } else {
        roleId = (
          await db.insert(rolesTable).values({
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
          .insert(rolePermissionsTable)
          .values(roleDef.permissions.map((p) => ({ roleId, permissionCode: p })))
          .onConflictDoNothing();
      }

      console.log(`    ${roleDef.code} (${roleDef.name})`);
    }

    console.log("Done.");
  } catch (error) {
    console.error("\nSeed error:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
    process.exit(process.exitCode);
  }
}

if (require.main === module) {
  void seedRoles();
}
