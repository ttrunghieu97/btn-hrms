import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as bcrypt from "bcrypt";
import { loadEnv } from "./env";
import {
  employees, employmentRecords, orgAssignments, employeeContracts,
  users, departments, positions,
} from "./schema";
import { eq, sql, and } from "drizzle-orm";

loadEnv();

const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing in .env");

const client = postgres(connectionString);
const db = drizzle(client);
const PASSWORD = process.env.SEED_PASSWORD ?? "123456";

const EMPLOYEES: {
  username: string; email: string; firstName: string; lastName: string;
  deptName: string; positionName: string; gender: string; phone: string;
}[] = [
  { username: "admin", email: "admin@btn-hrms.com", firstName: "Admin", lastName: "System", deptName: "BTN Holdings", positionName: "System Admin", gender: "other", phone: "0900000000" },
  { username: "nguyenvana", email: "nguyenvana@btn-hrms.com", firstName: "Nguyễn Văn", lastName: "An", deptName: "Phòng Công nghệ Thông tin", positionName: "Kỹ sư", gender: "male", phone: "0909123456" },
  { username: "tranthib", email: "tranthib@btn-hrms.com", firstName: "Trần Thị", lastName: "Bích", deptName: "Phòng Hành chính Nhân sự", positionName: "Nhân viên", gender: "female", phone: "0909123457" },
  { username: "levanc", email: "levanc@btn-hrms.com", firstName: "Lê Văn", lastName: "Cường", deptName: "Phòng Kinh doanh", positionName: "Nhân viên", gender: "male", phone: "0909123458" },
  { username: "phamthid", email: "phamthid@btn-hrms.com", firstName: "Phạm Thị", lastName: "Dung", deptName: "Phòng Hành chính Nhân sự", positionName: "Kế toán viên", gender: "female", phone: "0909123459" },
  { username: "hoangvane", email: "hoangvane@btn-hrms.com", firstName: "Hoàng Văn", lastName: "Em", deptName: "Phòng Công nghệ Thông tin", positionName: "Kỹ thuật viên", gender: "male", phone: "0909123460" },
  { username: "ngothif", email: "ngothif@btn-hrms.com", firstName: "Ngô Thị", lastName: "Phương", deptName: "Phòng Kinh doanh", positionName: "Trưởng phòng", gender: "female", phone: "0909123461" },
  { username: "dovang", email: "dovang@btn-hrms.com", firstName: "Đỗ Văn", lastName: "Giang", deptName: "Phòng Công nghệ Thông tin", positionName: "Trưởng phòng", gender: "male", phone: "0909123462" },
  { username: "vuthih", email: "vuthih@btn-hrms.com", firstName: "Vũ Thị", lastName: "Hạnh", deptName: "Phòng Hành chính Nhân sự", positionName: "Trưởng phòng", gender: "female", phone: "0909123463" },
];

async function seedEmployees() {
  console.log("Seeding employees...");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const emp of EMPLOYEES) {
    try {
      // Upsert user
      let userId: string;
      const existingUser = await db.select().from(users)
        .where(sql`${users.username} = ${emp.username}`).limit(1);

      if (existingUser.length > 0) {
        userId = existingUser[0]!.id;
      } else {
        userId = (await db.insert(users).values({
          username: emp.username, email: emp.email, passwordHash,
          isActive: true, isSuperAdmin: emp.username === "admin",
        }).returning())[0]!.id;
        console.log(`  Created user: ${emp.username}`);
      }

      // Get existing employee record (skip if already exists)
      const existingEmp = await db.select().from(employees)
        .where(eq(employees.userId, userId)).limit(1);
      if (existingEmp.length > 0) {
        console.log(`  Employee ${emp.firstName} ${emp.lastName} exists, skip`);
        continue;
      }

      // Get department
      const dept = await db.select().from(departments)
        .where(eq(departments.name, emp.deptName)).limit(1);
      const deptId = dept[0]?.id;

      // Get position
      const pos = await db.select().from(positions)
        .where(eq(positions.name, emp.positionName)).limit(1);
      const posId = pos[0]?.id;

      // Create employee
      const empCode = `EMP-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      const startDate = "2023-01-01";

      const [empRecord] = await db.insert(employees).values({
        userId, firstName: emp.firstName, lastName: emp.lastName,
        employeeCode: empCode, gender: emp.gender as any,
        phoneNumber: emp.phone, workEmail: emp.email, departmentId: deptId ?? undefined,
        startDate, status: "working", branchId: undefined,
      } as any).returning();

      const empId = empRecord!.id;

      // Employment record
      const [rec] = await db.insert(employmentRecords).values({
        employeeId: empId, startDate, isCurrent: true,
      }).returning();

      // Org assignment
      const [org] = await db.insert(orgAssignments).values({
        employeeId: empId, departmentId: deptId ?? undefined,
        jobTitle: emp.positionName,
        assignmentType: "primary", effectiveFrom: startDate, isCurrent: true,
        note: "Khởi tạo từ seed",
      }).returning();

      // Contract
      await db.insert(employeeContracts).values({
        employeeId: empId, contractNumber: `${empCode}-01`,
        contractType: "permanent", status: "active",
        version: 1, isCurrent: true, effectiveFrom: startDate,
      });

      // Link back
      await db.update(employees).set({
        currentEmploymentRecordId: rec!.id,
        currentOrgAssignmentId: org!.id,
      }).where(eq(employees.id, empId));

      console.log(`  Created: ${emp.firstName} ${emp.lastName} (${emp.username}) - ${emp.deptName}`);
    } catch (err: any) {
      console.error(`  Error for ${emp.username}:`, err.message);
    }
  }

  console.log("\nDone. Employee seed completed.");
  await client.end();
}

seedEmployees().catch((err) => {
  console.error("Fatal:", err.message);
  process.exitCode = 1;
  client.end();
});
