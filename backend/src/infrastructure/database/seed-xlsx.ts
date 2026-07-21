import { drizzle } from "drizzle-orm/postgres-js";
import { todayDateString } from "../../shared/utils/date-format";
import postgres from "postgres";
import * as bcrypt from "bcrypt";
import * as XLSX from "xlsx";
import * as path from "path";
import { loadEnv } from "./env";
import {
  employees,
  employeeEducations,
  employeeContracts,
  employmentRecords,
  orgAssignments,
  users,
  positions,
  departments,
} from "./schema";
import { and, eq, sql } from "drizzle-orm";

loadEnv();

const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing in .env");

const client = postgres(connectionString);
const db = drizzle(client);

const XLSX_PATH = process.env.XLSX_PATH ?? path.resolve(__dirname, "../../../../../employee.xlsx");
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "123456";

const GENDER_MAP: Record<string, string> = {
  Nam: "male",
  Nữ: "female",
};

const EDUCATION_MAP: Record<string, string> = {
  "THPT": "upper_secondary", "12/12": "upper_secondary", "9/10": "primary",
  "Đại học": "bachelor", "Đại học": "bachelor",
  "Cao Đẳng": "college", "Cao đẳng": "college",
  "Trung cấp": "vocational", "Trung cấp nghề": "vocational",
};

function parsePositionDepartment(raw: string | null): { positionName: string; departmentName?: string } {
  if (!raw) return { positionName: "Nhân viên" };
  const v = raw.replace(/\n/g, " ").trim();

  if (v === "Trưởng phòng kinh doanh") return { positionName: "Trưởng phòng", departmentName: "Phòng Kinh doanh" };
  if (v === "Nhân viên IT") return { positionName: "Nhân viên", departmentName: "Phòng Công nghệ Thông tin" };
  if (v === "Nhân viên Hành chính - Nhân sự" || v === "Nhân viên nhân sự")
    return { positionName: "Nhân viên", departmentName: "Phòng Hành chính Nhân sự" };
  if (v === "Nhân viên KD & TT" || v === "Nhân viên kinh doanh" || v === "Nhân viên kinh doanh và sự kiện" || v === "Nhân viên bán hàng" || v === "Nhân viên bán vé")
    return { positionName: "Nhân viên", departmentName: "Phòng Kinh doanh" };
  if (v === "Kế toán trưởng" || v === "Kế toán viên & Thủ quỹ" || v === "Nhân viên Kế toán" || v === "Kế toán dự án")
    return { positionName: v.startsWith("Kế toán trưởng") ? "Kế toán trưởng" : "Kế toán viên", departmentName: "Phòng Hành chính Nhân sự" };

  if (v.startsWith("Nhân viên")) return { positionName: "Nhân viên" };
  if (v.startsWith("Trưởng phòng")) return { positionName: "Trưởng phòng" };

  const posMap: Record<string, string> = {
    "PGĐ": "Phó Giám đốc", "GĐ": "Giám đốc", "HĐTV": "Nhân viên",
    "BQLDA": "Nhân viên", "Bảo vệ": "Bảo vệ", "Lái xe": "Lái xe",
    "Thủ kho": "Thủ kho", "QL Nhà hàng": "Quản lý nhà hàng",
    "soát vé": "Nhân viên", "Kỹ thuật": "Kỹ thuật viên",
    "Công nhân kỹ thuật": "Công nhân kỹ thuật", "Kỹ sư môi trường": "Kỹ sư",
    "Tổ trưởng Tổ Kỹ thuật": "Tổ trưởng",
  };

  if (v.includes("/")) {
    const parts = v.split("/").map((p) => p.trim());
    for (const p of parts) {
      if (posMap[p]) return { positionName: posMap[p] };
    }
    return { positionName: "Nhân viên" };
  }

  return { positionName: posMap[v] ?? "Nhân viên" };
}

function parseDate(day: unknown, month: unknown, year: unknown): string | null {
  const d = day != null ? String(day).padStart(2, "0") : null;
  const m = month != null ? String(month).padStart(2, "0") : null;
  const y = year != null ? String(year) : null;
  if (d && m && y) return `${y}-${m}-${d}`;
  return null;
}

function parseSingleDate(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return null;
}

function splitVietnameseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: parts[0]! };
  const ln = parts.pop()!;
  return { firstName: parts.join(" "), lastName: ln };
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

async function seedEmployees() {
  console.log(`Reading ${XLSX_PATH}...`);
  const wb = XLSX.readFile(XLSX_PATH);
  const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!]!, { header: 1 });

  let hdr = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]![0] === "STT") { hdr = i; break; }
  }
  if (hdr === -1) throw new Error("Cannot find header row");

  const dataRows = rows.slice(hdr + 1).filter((r) => r[1]?.toString().trim() && r[2]?.toString().trim());
  console.log(`Employees to seed: ${dataRows.length}`);

  const posRows = await db.select().from(positions);
  const deptRows = await db.select().from(departments);
  const posMap = new Map(posRows.map((p) => [p.name, p.id]));
  const deptMap = new Map(deptRows.map((d) => [d.name, d.id]));

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  let count = 0;

  for (const row of dataRows) {
    const empCode = row[1]!.toString().trim();
    const fullName = row[2]!.toString().trim();
    const rawPosDept = row[3]?.toString().trim() || null;
    const phone = row[10]?.toString().trim() || null;
    const address = row[11]?.toString().trim() || null;
    const dob = parseDate(row[7], row[8], row[9]);
    const contractDate = parseSingleDate(row[17]);
    const probationDate = parseSingleDate(row[12]);
    const startDate = contractDate || probationDate || null;
    const endDate = parseSingleDate(row[18]);
    const lastWorkingDate = parseSingleDate(row[19]);
    const identityNumber = row[20]?.toString().trim() || null;
    const identityDate = parseDate(row[21], row[22], row[23]);
    const identityPlace = row[24]?.toString().trim() || null;
    const email = row[25]?.toString().trim() || null;
    const taxCode = row[26]?.toString().trim() || null;
    const genderRaw = row[4]?.toString().trim() || null;
    const gender = genderRaw ? (GENDER_MAP[genderRaw] ?? "unknown") : "unknown";
    const { firstName, lastName } = splitVietnameseName(fullName);
    const educationRaw = row[6]?.toString().trim() || null;
    const educationLevel = educationRaw ? (EDUCATION_MAP[educationRaw] ?? null) : null;

    const { positionName, departmentName } = parsePositionDepartment(rawPosDept);
    const positionId = posMap.get(positionName) || null;
    const departmentId = departmentName ? (deptMap.get(departmentName) || null) : null;

    // Username: given name + first letters of family + middle
    const nameParts = fullName.trim().split(/\s+/);
    const givenName = (nameParts[nameParts.length - 1] ?? "").toLowerCase();
    const familyInitial = (nameParts[0]?.[0] ?? "").toLowerCase();
    const middleInitial = nameParts.length > 2 ? (nameParts[nameParts.length - 2]?.[0] ?? "").toLowerCase() : "";
    let username = stripDiacritics(givenName + familyInitial + middleInitial).slice(0, 30);
    // Deduplicate if username taken
    let usernameSuffix = 0;
    while (true) {
      const testUser = await db.select({ id: users.id }).from(users).where(sql`${users.username} = ${username}`).limit(1);
      if (testUser.length === 0) break;
      // Check if this user is already linked to this employee code
      const testEmp = await db.select({ id: employees.id }).from(employees).where(sql`${employees.employeeCode} = ${empCode}`).limit(1);
      if (testEmp.length > 0) break; // re-running, existing user is fine
      usernameSuffix++;
      const suffix = usernameSuffix.toString();
      username = stripDiacritics(givenName + familyInitial + middleInitial).slice(0, 30 - suffix.length) + suffix;
    }

    const today = todayDateString();
    const effectiveStart = startDate ?? today;

    try {
      // Upsert user
      let userId: string;
      const existingUser = await db.select().from(users).where(sql`${users.username} = ${username}`).limit(1);
      if (existingUser.length > 0) {
        userId = existingUser[0]!.id;
      } else {
        userId = (await db.insert(users).values({
          username,
          email: email ?? `${username}@btn-hrms.com`,
          passwordHash,
          isActive: true,
        }).returning())[0]!.id;
      }

      // Upsert employee
      const existingEmp = await db.select().from(employees).where(sql`${employees.employeeCode} = ${empCode}`).limit(1);
      let empId: string;
      if (existingEmp.length > 0) {
        empId = existingEmp[0]!.id;
        await db.update(employees).set({
          firstName, lastName, gender: gender as any, dob, phoneNumber: phone,
          address, startDate: effectiveStart, endDate, lastWorkingDate,
          identityNumber, identityDate, identityPlace, workEmail: email, taxCode,
          updatedAt: new Date(),
        }).where(sql`${employees.id} = ${empId}`);
      } else {
        empId = (await db.insert(employees).values({
          userId, firstName, lastName, employeeCode: empCode, gender: gender as any,
          dob, phoneNumber: phone, address, startDate: effectiveStart, endDate,
          lastWorkingDate, identityNumber, identityDate, identityPlace, workEmail: email,
          taxCode, status: lastWorkingDate ? "terminated" : "working",
        } as any).returning())[0]!.id;
      }

      // Ensure employment record
      const existingRec = await db.select().from(employmentRecords)
        .where(and(eq(employmentRecords.employeeId, empId), eq(employmentRecords.isCurrent, true))).limit(1);
      let recId: string;
      if (existingRec.length > 0) {
        recId = existingRec[0]!.id;
      } else {
        recId = (await db.insert(employmentRecords).values({
          employeeId: empId, startDate: effectiveStart, endDate: endDate ?? null, isCurrent: true,
        }).returning())[0]!.id;
      }

      // Ensure org assignment
      const existingOrg = await db.select().from(orgAssignments)
        .where(and(eq(orgAssignments.employeeId, empId), eq(orgAssignments.isCurrent, true))).limit(1);
      let orgId: string;
      if (existingOrg.length > 0) {
        orgId = existingOrg[0]!.id;
        await db.update(orgAssignments).set({
          departmentId, jobTitle: positionName, updatedAt: new Date(),
        }).where(sql`${orgAssignments.id} = ${orgId}`);
      } else {
        orgId = (await db.insert(orgAssignments).values({
          employeeId: empId, departmentId, jobTitle: positionName,
          assignmentType: "primary", effectiveFrom: effectiveStart,
          effectiveTo: endDate ?? null, isCurrent: true,
          note: "Khởi tạo từ seed",
        }).returning())[0]!.id;
      }

      // Ensure contract
      const existingCt = await db.select().from(employeeContracts)
        .where(and(eq(employeeContracts.employeeId, empId), eq(employeeContracts.isCurrent, true))).limit(1);
      if (existingCt.length === 0) {
        await db.insert(employeeContracts).values({
          employeeId: empId, contractNumber: `${empCode}-01`,
          contractType: "permanent", status: lastWorkingDate ? "terminated" : "active",
          version: 1, isCurrent: true, effectiveFrom: effectiveStart, effectiveTo: endDate ?? null,
        });
      }

      // Link IDs
      await db.update(employees).set({
        currentEmploymentRecordId: recId, currentOrgAssignmentId: orgId, updatedAt: new Date(),
      }).where(eq(employees.id, empId));

      // Education
      if (educationLevel) {
        const existingEdu = await db.select().from(employeeEducations)
          .where(and(eq(employeeEducations.employeeId, empId), eq(employeeEducations.educationLevel, educationLevel as any), sql`${employeeEducations.deletedAt} is null`)).limit(1);
        if (existingEdu.length === 0) {
          await db.insert(employeeEducations).values({ employeeId: empId, educationLevel: educationLevel as any, verified: false });
        }
      }

      count++;
      if (count % 10 === 0) process.stdout.write(".");
    } catch (err: any) {
      console.error(`\nError at ${empCode} (${fullName}):`, err.message);
    }
  }

  // Recompute highest_education_level
  console.log("\nRecomputing highest_education_level...");
  const eduGroups = await db
    .select({ employeeId: employeeEducations.employeeId })
    .from(employeeEducations).where(sql`${employeeEducations.deletedAt} is null`)
    .groupBy(employeeEducations.employeeId);
  const RANK: Record<string, number> = { other: 0, primary: 10, lower_secondary: 20, upper_secondary: 30, vocational: 35, college: 40, bachelor: 50, master: 60, doctor: 70 };
  for (const g of eduGroups) {
    const levels = await db.select({ level: employeeEducations.educationLevel })
      .from(employeeEducations)
      .where(and(eq(employeeEducations.employeeId, g.employeeId), sql`${employeeEducations.deletedAt} is null`));
    let highest: string | null = null;
    let hr = -1;
    for (const l of levels) { const r = RANK[l.level] ?? 0; if (r > hr) { hr = r; highest = l.level; } }
    if (highest) await db.update(employees).set({ highestEducationLevel: highest as any, updatedAt: new Date() }).where(eq(employees.id, g.employeeId));
  }

  console.log(`\nDone. Seeded ${count} employees.`);
}

seedEmployees()
  .catch((err) => { console.error("\nFatal:", err.message); process.exitCode = 1; })
  .finally(() => client.end());
