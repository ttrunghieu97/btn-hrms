import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";
import postgres from "postgres";
import { AUDIT_LOG_KEY } from "../../../shared/decorators/audit-log.decorator";
import { PayrollController } from "../../../modules/payroll/payroll/payroll.controller";
import { GetPayrollByEmployeeUseCase } from "../../../modules/payroll/payroll/use-cases/get-payroll-by-employee.usecase";
import { PayrollRepository } from "../../../modules/payroll/payroll/repositories/payroll.repository";
import { PayslipsController } from "../../../modules/payroll/payslips/payslips.controller";
import { ListPayslipsUseCase } from "../../../modules/payroll/payslips/use-cases/list-payslips.usecase";
import { GetPayslipUseCase } from "../../../modules/payroll/payslips/use-cases/get-payslip.usecase";
import { PublishPayslipUseCase } from "../../../modules/payroll/payslips/use-cases/publish-payslip.usecase";
import {
  ApprovePayrollRunUseCase,
  PostPayrollRunUseCase,
} from "../../../modules/payroll/payroll-runs/use-cases/payroll-runs.usecases";
import { PayrollRunStateMachine } from "../../../modules/payroll/payroll-runs/services/payroll-run-state-machine";
import { FacePresenceService } from "../../../modules/attendance/attendances/services/face-presence.service";
import { FacePresenceAdapter } from "../../../modules/attendance/attendances/services/face-presence.adapter";
import { AttendanceEvidenceService } from "../../../modules/attendance/attendances/services/attendance-evidence.service";
import { QueryScopeService } from "../query-scope.service";
import { PolicyEngine } from "../policy-engine/policy.engine";
import { PermissionHierarchyResolver } from "../permissions/permission-hierarchy.resolver";
import { Permissions } from "../permissions/permissions.registry";
import type { AuthUser } from "../types/auth-user.interface";

const repoRoot = resolve(__dirname, "../../../../../..");
const migration0008Path = resolve(
  repoRoot,
  "apps/api/drizzle/0008_stormy_monster_badoon.sql",
);

function makeSelfUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-self",
    userId: "user-self",
    username: "emp.self",
    employeeId: "emp-self",
    departmentId: "dept-1",
    permissions: [Permissions.PAYROLL_VIEW_SELF],
    roles: ["employee"],
    isSuperAdmin: false,
    ...overrides,
  };
}

describe("Phase 6A — Release Blocker Remediation Suite", () => {
  describe("1. Payroll Safety (BIZ-004 & BIZ-005)", () => {
    it("blocks ApprovePayrollRunUseCase, PostPayrollRunUseCase, and PublishPayslipUseCase when any payslip is provisional", async () => {
      const provisionalPayslip = {
        id: "ps-prov-1",
        employeeId: "emp-self",
        payrollRunId: "run-1",
        status: "draft",
        metadata: {
          calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
          policyBlockerCode: "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
          unconfirmedPolicyComponents: [
            "tax_amount",
            "statutory_insurance_amount",
            "allowance_components",
          ],
        },
      };

      const runRepo = {
        findById: jest.fn().mockResolvedValue({
          id: "run-1",
          status: "pending_approval",
          calculationVersionId: "v1",
          calculationHash: "hash-1234",
        }),
        getApprovalHistory: jest.fn().mockResolvedValue([
          { action: "REQUESTED", performedByUserId: "user-maker" },
        ]),
        findPayslipsByRunId: jest.fn().mockResolvedValue([provisionalPayslip]),
        transaction: jest.fn(),
      };
      const stateMachine = new PayrollRunStateMachine();
      const eventOutbox = { stage: jest.fn() };

      const approveUseCase = new ApprovePayrollRunUseCase(
        runRepo as any,
        stateMachine,
        eventOutbox as any,
      );
      await expect(
        approveUseCase.execute("run-1", "user-checker"),
      ).rejects.toThrow(
        "Provisional payroll run cannot be approved while HR/Finance payroll policies remain unconfirmed",
      );
      expect(runRepo.transaction).not.toHaveBeenCalled();

      runRepo.findById.mockResolvedValue({
        id: "run-1",
        status: "approved",
        calculationVersionId: "v1",
        calculationHash: "hash-1234",
      });
      const postUseCase = new PostPayrollRunUseCase(
        runRepo as any,
        stateMachine,
        eventOutbox as any,
      );
      await expect(
        postUseCase.execute("run-1", "user-checker"),
      ).rejects.toThrow(
        "Provisional payroll run cannot be posted while HR/Finance payroll policies remain unconfirmed",
      );
      expect(runRepo.transaction).not.toHaveBeenCalled();

      const payslipsRepo = {
        findById: jest.fn().mockResolvedValue(provisionalPayslip),
        update: jest.fn(),
        transaction: jest.fn(),
      };
      const publishUseCase = new PublishPayslipUseCase(
        payslipsRepo as any,
        { get: jest.fn().mockReturnValue({}) } as any,
        eventOutbox as any,
      );
      await expect(
        publishUseCase.execute("ps-prov-1", { status: "published" }),
      ).rejects.toThrow(
        "Provisional payroll payslip cannot be published while HR/Finance payroll policies remain unconfirmed",
      );
      expect(payslipsRepo.transaction).not.toHaveBeenCalled();
    });

    it("ensures self-service payslip and payroll endpoints only return published payslips", async () => {
      const queryScopeService = new QueryScopeService(
        new PolicyEngine(new PermissionHierarchyResolver()),
      );
      const selfUser = makeSelfUser();
      const selfScope = queryScopeService.resolveScope(selfUser, "payroll");
      expect(selfScope).toEqual({ tier: "self", employeeId: "emp-self" });

      // 1. ListPayslipsUseCase filters out draft payslips for scope.tier === 'self'
      const rawRows = [
        {
          id: "ps-draft",
          employeeId: "emp-self",
          payrollRunId: "run-1",
          grossPay: "15000000",
          totalDeductions: "0",
          netPay: "15000000",
          currency: "VND",
          status: "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ps-pub",
          employeeId: "emp-self",
          payrollRunId: "run-0",
          grossPay: "15000000",
          totalDeductions: "1500000",
          netPay: "13500000",
          currency: "VND",
          status: "published",
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const listUseCase = new ListPayslipsUseCase(
        {
          list: jest.fn().mockResolvedValue({
            rows: rawRows,
            total: 2,
            page: 1,
            limit: 20,
          }),
        } as any,
        { get: jest.fn() } as any,
      );
      const listRes = await listUseCase.execute(
        { page: 1, limit: 20 },
        selfScope,
      );
      expect(listRes.rows).toHaveLength(1);
      expect(listRes.rows[0]?.id).toBe("ps-pub");
      expect(listRes.total).toBe(1);

      // 2. GetPayslipUseCase via PayslipsController.get blocks draft payslip for self-service user
      const getPayslipUseCase = new GetPayslipUseCase(
        {
          findById: jest
            .fn()
            .mockImplementation(async (id: string) =>
              rawRows.find((r) => r.id === id) ?? null,
            ),
        } as any,
        { get: jest.fn() } as any,
      );
      const payslipsController = new PayslipsController(
        listUseCase,
        getPayslipUseCase,
        {} as any,
        queryScopeService,
      );

      await expect(
        payslipsController.get("ps-draft", { user: selfUser }),
      ).rejects.toThrow("Payslip not found");

      const publishedDto = await payslipsController.get("ps-pub", {
        user: selfUser,
      });
      expect(publishedDto.id).toBe("ps-pub");

      // 3. GetPayrollByEmployeeUseCase via PayrollController.getByEmployee passes publishedOnly: true for self-service user
      const mockDb = {
        query: {
          payslips: {
            findMany: jest.fn().mockResolvedValue([rawRows[0]]), // only draft row returned by mock
          },
        },
      };
      const payrollRepo = new PayrollRepository(mockDb as any);
      const getPayrollByEmployeeUseCase = new GetPayrollByEmployeeUseCase(
        payrollRepo,
        { get: jest.fn() } as any,
      );
      const payrollController = new PayrollController(
        {} as any,
        getPayrollByEmployeeUseCase,
        {} as any,
        queryScopeService,
      );

      await expect(
        payrollController.getByEmployee("emp-self", { user: selfUser }),
      ).rejects.toThrow("Payroll not found");
    });

    it("preserves existing provisional metadata on PayrollRepository.upsertByEmployeeId and audits PayrollController.upsert", async () => {
      // Verify @AuditLog metadata on PayrollController.prototype.upsert
      const auditMeta = Reflect.getMetadata(
        AUDIT_LOG_KEY,
        PayrollController.prototype.upsert,
      );
      expect(auditMeta).toEqual({
        action: "payroll_upsert",
        entity: "payroll",
      });

      // Verify upsertByEmployeeId preserves provisional metadata unless explicitly overridden
      let capturedSet: Record<string, unknown> | undefined;
      const existingPayslip = {
        id: "ps-settlement-1",
        employeeId: "emp-self",
        payrollRunId: "run-manual-1",
        status: "draft",
        grossPay: "10000000",
        totalDeductions: "0",
        netPay: "10000000",
        currency: "VND",
        metadata: {
          source: "offboarding-final-settlement",
          isProvisional: true,
          settlementComplete: false,
          requiresManualReviewBeforePublish: true,
          policyBlockerCode: "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED",
        },
        payrollItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const txMock = {
        query: {
          employees: {
            findFirst: jest
              .fn()
              .mockResolvedValue({ id: "emp-self", branchId: null }),
          },
          payrollPeriods: {
            findFirst: jest.fn().mockResolvedValue({
              id: "period-1",
              code: "manual-2026-06",
              startsOn: "2026-06-01",
              endsOn: "2026-06-30",
            }),
          },
          payrollRuns: {
            findFirst: jest.fn().mockResolvedValue({
              id: "run-manual-1",
              payrollPeriodId: "period-1",
            }),
          },
          payslips: {
            findFirst: jest.fn().mockResolvedValue(existingPayslip),
          },
        },
        update: jest.fn(() => ({
          set: jest.fn((values: Record<string, unknown>) => {
            capturedSet = values;
            return {
              where: jest.fn().mockResolvedValue(undefined),
            };
          }),
        })),
        delete: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(undefined),
        })),
        insert: jest.fn(() => ({
          values: jest.fn().mockResolvedValue(undefined),
        })),
      };

      const repo = new PayrollRepository(txMock as any);
      await repo.upsertByEmployeeId(
        "emp-self",
        {
          salary: "12000000",
          effectiveFrom: "2026-06-01",
        },
        txMock as any,
      );

      expect(capturedSet?.metadata).toEqual(
        expect.objectContaining({
          isProvisional: true,
          settlementComplete: false,
          requiresManualReviewBeforePublish: true,
          policyBlockerCode: "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED",
        }),
      );
    });
  });

  describe("2. Database Migration 0008 & PostgreSQL Constraint Verification (BIZ-003 & BIZ-006/SEC-005)", () => {
    it("verifies migration 0008 SQL structure and executes it inside a rolled-back PostgreSQL transaction", async () => {
      const sqlContent = readFileSync(migration0008Path, "utf8");
      expect(sqlContent).toContain(
        'ALTER TABLE "employees" DROP CONSTRAINT "employees_user_id_users_id_fk"',
      );
      expect(sqlContent).toContain(
        'ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict',
      );
      expect(sqlContent).toContain(
        'CREATE UNIQUE INDEX "uq_attendance_violations_session_emp_code"',
      );
      expect(sqlContent).toContain(
        'CREATE UNIQUE INDEX "uq_attendance_violations_null_session_dedup"',
      );

      const journal = JSON.parse(
        readFileSync(
          resolve(repoRoot, "apps/api/drizzle/meta/_journal.json"),
          "utf8",
        ),
      );
      expect(
        journal.entries.some(
          (e: { tag: string }) => e.tag === "0008_stormy_monster_badoon",
        ),
      ).toBe(true);

      const apiEnvPath = resolve(repoRoot, "apps/api/.env");
      const rootEnvPath = resolve(repoRoot, ".env");
      const parsedEnv = {
        ...(existsSync(rootEnvPath)
          ? dotenv.parse(readFileSync(rootEnvPath, "utf8"))
          : {}),
        ...(existsSync(apiEnvPath)
          ? dotenv.parse(readFileSync(apiEnvPath, "utf8"))
          : {}),
      };
      const dbUrl =
        process.env.DATABASE_DIRECT_URL ||
        process.env.DATABASE_URL ||
        parsedEnv.DATABASE_DIRECT_URL ||
        parsedEnv.DATABASE_URL;
      expect(dbUrl).toBeDefined();

      const sql = postgres(dbUrl, { max: 1, connect_timeout: 3 });
      try {
        await expect(
          sql.begin(async (tx) => {
            await tx.unsafe("SELECT pg_advisory_xact_lock(20260601)");
            // 1. Seed a test user and employee
            const [user] = await tx.unsafe<{ id: string }[]>(`
              INSERT INTO users (username, email, password_hash)
              VALUES ('phase6a_test_user', 'phase6a@example.com', 'hash')
              RETURNING id
            `);
            const [emp] = await tx.unsafe<{ id: string }[]>(
              `
              INSERT INTO employees (user_id, first_name, last_name, employee_code)
              VALUES ($1, 'Phase6A', 'Tester', 'EMP-PHASE6A-001')
              RETURNING id
            `,
              [user!.id],
            );

            // 2. Seed pre-existing duplicate NULL-session violations (one OPEN, one RESOLVED for 2026-06-25)
            await tx.unsafe(
              `
              INSERT INTO attendance_violations (employee_id, session_id, code, severity, status, metadata)
              VALUES
                ($1, NULL, 'NO_SHOW', 'CRITICAL', 'OPEN', '{"date":"2026-06-25","dedupKey":"emp::2026-06-25::asgn-1::NO_SHOW"}'::jsonb),
                ($1, NULL, 'NO_SHOW', 'CRITICAL', 'RESOLVED', '{"date":"2026-06-25","dedupKey":"emp::2026-06-25::asgn-1::NO_SHOW"}'::jsonb)
            `,
              [emp!.id],
            );

            // 3. Apply all statements from 0008_stormy_monster_badoon.sql
            const statements = sqlContent
              .split("--> statement-breakpoint")
              .map((s) => s.trim())
              .filter(Boolean);
            for (const stmt of statements) {
              await tx.unsafe(stmt);
            }

            // 4. Verify pre-existing duplicate was deduplicated and RESOLVED row was preserved
            const remaining = await tx.unsafe<{ status: string }[]>(
              `
              SELECT status FROM attendance_violations WHERE employee_id = $1
            `,
              [emp!.id],
            );
            expect(remaining).toHaveLength(1);
            expect(remaining[0]?.status).toBe("RESOLVED");

            // 5. Verify duplicate NULL-session violation for the SAME date/dedupKey is ignored by ON CONFLICT DO NOTHING
            await tx.unsafe(
              `
              INSERT INTO attendance_violations (employee_id, session_id, code, severity, status, metadata)
              VALUES ($1, NULL, 'NO_SHOW', 'CRITICAL', 'OPEN', '{"date":"2026-06-25","dedupKey":"emp::2026-06-25::asgn-1::NO_SHOW"}'::jsonb)
              ON CONFLICT DO NOTHING
            `,
              [emp!.id],
            );
            const afterSameDay = await tx.unsafe<{ id: string }[]>(
              `SELECT id FROM attendance_violations WHERE employee_id = $1`,
              [emp!.id],
            );
            expect(afterSameDay).toHaveLength(1);

            // 6. Verify NULL-session violation for a DIFFERENT date (2026-06-26) IS permitted
            await tx.unsafe(
              `
              INSERT INTO attendance_violations (employee_id, session_id, code, severity, status, metadata)
              VALUES ($1, NULL, 'NO_SHOW', 'CRITICAL', 'OPEN', '{"date":"2026-06-26","dedupKey":"emp::2026-06-26::asgn-2::NO_SHOW"}'::jsonb)
            `,
              [emp!.id],
            );
            const afterNextDay = await tx.unsafe<{ id: string }[]>(
              `SELECT id FROM attendance_violations WHERE employee_id = $1`,
              [emp!.id],
            );
            expect(afterNextDay).toHaveLength(2);

            // 7. Verify deleting a user linked to an employee is blocked by ON DELETE RESTRICT (23503)
            await expect(
              tx.unsafe(`DELETE FROM users WHERE id = $1`, [user!.id]),
            ).rejects.toThrow(/employees_user_id_users_id_fk/);

            throw new Error("ROLLBACK_INTENTIONAL");
          }),
        ).rejects.toThrow("ROLLBACK_INTENTIONAL");
      } finally {
        await sql.end();
      }
    });
  });

  describe("3. Deployment Configuration & FacePresenceService Fail-Closed (SEC-004 / ARC-007)", () => {
    const origStrict = process.env.ATTENDANCE_STRICT_FACE_DETECTION;
    const origMode = process.env.ATTENDANCE_FACE_VERIFICATION_MODE;

    afterEach(() => {
      process.env.ATTENDANCE_STRICT_FACE_DETECTION = origStrict;
      process.env.ATTENDANCE_FACE_VERIFICATION_MODE = origMode;
    });

    it("fails closed in FacePresenceService + AttendanceEvidenceService when ATTENDANCE_STRICT_FACE_DETECTION=true", async () => {
      process.env.ATTENDANCE_STRICT_FACE_DETECTION = "true";

      const facePresenceService = new FacePresenceService();
      const faceAdapter = new FacePresenceAdapter(facePresenceService);
      const evidenceService = new AttendanceEvidenceService(
        { get: () => ({ userId: "user-1" }) } as any,
        { validate: () => ({ ok: true, mime: "image/jpeg" }) } as any,
        faceAdapter,
        { store: jest.fn() } as any,
        {
          observeAttendanceVerificationStep: jest.fn(),
          incrementAttendanceFaceFail: jest.fn(),
          observeAttendanceUploadDuration: jest.fn(),
        } as any,
      );

      await expect(
        evidenceService.process({
          employeeId: "emp-1",
          buffer: Buffer.from("fake-selfie"),
          mime: "image/jpeg",
        }),
      ).rejects.toThrow("Selfie rejected: no face detected");
    });

    it("declares ATTENDANCE_STRICT_FACE_DETECTION and ATTENDANCE_FACE_VERIFICATION_MODE across deployment manifests", () => {
      const composeContent = readFileSync(
        resolve(repoRoot, "docker-compose.yml"),
        "utf8",
      );
      const rootEnvExample = readFileSync(
        resolve(repoRoot, ".env.example"),
        "utf8",
      );
      const apiEnvExample = readFileSync(
        resolve(repoRoot, "apps/api/.env.example"),
        "utf8",
      );

      expect(composeContent).toContain("ATTENDANCE_STRICT_FACE_DETECTION:");
      expect(composeContent).toContain("ATTENDANCE_FACE_VERIFICATION_MODE:");
      expect(rootEnvExample).toContain("ATTENDANCE_STRICT_FACE_DETECTION=");
      expect(apiEnvExample).toContain("ATTENDANCE_STRICT_FACE_DETECTION=");
    });
  });
});
