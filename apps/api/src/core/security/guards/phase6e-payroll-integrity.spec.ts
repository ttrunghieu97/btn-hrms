import "reflect-metadata";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ServiceUnavailableException } from "@nestjs/common";
import * as schema from "../../../infrastructure/database/schema";
import { AUDIT_LOG_KEY } from "../../../shared/decorators/audit-log.decorator";
import {
  extractAuditEntityId,
} from "../../../shared/interceptors/audit-log.interceptor";
import { redactSensitive } from "../../../shared/utils/redaction.util";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { PayrollRunsController } from "../../../modules/payroll/payroll-runs/payroll-runs.controller";
import { PayrollRunsRepository } from "../../../modules/payroll/payroll-runs/repositories/payroll-runs.repository";
import {
  ApprovePayrollRunUseCase,
  GeneratePayrollRunUseCase,
  PostPayrollRunUseCase,
  RequestPayrollApprovalUseCase,
} from "../../../modules/payroll/payroll-runs/use-cases/payroll-runs.usecases";
import { PayrollRunStateMachine } from "../../../modules/payroll/payroll-runs/services/payroll-run-state-machine";
import { PayrollDecisionHandler } from "../../../integration/payroll-approval/payroll-decision.handler.service";
import { CreatePayrollPeriodDto } from "../../../modules/payroll/payroll-periods/dto/create-payroll-period.dto";
import { UpdatePayrollPeriodDto } from "../../../modules/payroll/payroll-periods/dto/update-payroll-period.dto";
import { UpdatePayrollPeriodUseCase } from "../../../modules/payroll/payroll-periods/use-cases/update-payroll-period.usecase";
import { PublishPayslipDto } from "../../../modules/payroll/payslips/dto/publish-payslip.dto";
import { PublishPayslipUseCase } from "../../../modules/payroll/payslips/use-cases/publish-payslip.usecase";
import { PayslipsRepository } from "../../../modules/payroll/payslips/repositories/payslips.repository";
import { PayrollRepository } from "../../../modules/payroll/payroll/repositories/payroll.repository";
import { CalculateFinalSettlementUseCase } from "../../../modules/payroll/payroll/use-cases/calculate-final-settlement.usecase";
import { UpsertSalaryStructureUseCase } from "../../../modules/payroll/salary-structures/use-cases/salary-structures.usecases";
import { EmployeeAllowancesController } from "../../../modules/workforce/employee-allowances/employee-allowances.controller";
import { EmployeeSocialInsuranceController } from "../../../modules/workforce/employee-social-insurance/employee-social-insurance.controller";
import { GetReadinessUseCase } from "../../../app/use-cases/get-readiness.usecase";
import { GetStrictReadinessUseCase } from "../../../app/use-cases/get-strict-readiness.usecase";
import { GetSystemHealthUseCase } from "../../../infrastructure/monitoring/system-health/use-cases/get-system-health.usecase";
import { FacePresenceService } from "../../../modules/attendance/attendances/services/face-presence.service";
import { EmailDeliveryService } from "../../../modules/platform-notifications/channels/email-delivery.service";
import { SmsDeliveryService } from "../../../modules/platform-notifications/channels/sms-delivery.service";
import { PushDeliveryService } from "../../../modules/platform-notifications/channels/push-delivery.service";

function resolveTestDbUrl(): string {
  const repoRoot = resolve(__dirname, "../../../../../..");
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
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not configured for PostgreSQL integration test");
  }
  return dbUrl;
}

describe("Phase 6E — Payroll Integrity, SoD, Audit Privacy & Readiness Remediation Suite", () => {
  const stateMachine = new PayrollRunStateMachine();

  describe("1. P0 — P6D-001: Protect Payroll Lifecycle and Finalized Runs", () => {
    it("blocks GeneratePayrollRunUseCase on posted, approved, pending_approval, and processing runs without touching items or payslips", async () => {
      for (const status of ["posted", "approved", "pending_approval", "processing"]) {
        const repo = {
          findById: jest.fn().mockResolvedValue({
            id: `run-${status}`,
            payrollPeriodId: "period-1",
            branchId: null,
            status,
          }),
          transaction: jest.fn(),
          markRunProcessing: jest.fn(),
          deleteRunItems: jest.fn(),
          deleteRunPayslips: jest.fn(),
        };
        const useCase = new GeneratePayrollRunUseCase(
          repo as any,
          { getEffectiveDailySummaries: jest.fn() },
          { evaluate: jest.fn() },
          { getAdjustmentDeltas: jest.fn() },
          { stage: jest.fn() } as any,
          stateMachine,
        );

        await expect(useCase.execute(`run-${status}`, "user-maker")).rejects.toThrow(
          status === "processing"
            ? "Invalid payroll run transition: processing → processing"
            : "Payroll run cannot be regenerated after approval",
        );
        expect(repo.transaction).not.toHaveBeenCalled();
        expect(repo.markRunProcessing).not.toHaveBeenCalled();
        expect(repo.deleteRunItems).not.toHaveBeenCalled();
        expect(repo.deleteRunPayslips).not.toHaveBeenCalled();
      }
    });

    it("enforces draft -> pending_approval and blocks approved -> pending_approval demotion in PayrollRunStateMachine and RequestPayrollApprovalUseCase", async () => {
      expect(stateMachine.canTransition("draft", "pending_approval")).toBe(true);
      expect(stateMachine.canTransition("processing", "pending_approval")).toBe(true);
      expect(stateMachine.canTransition("approved", "pending_approval")).toBe(false);

      const repo = {
        findById: jest.fn().mockResolvedValue({
          id: "run-approved-1",
          status: "approved",
        }),
        transaction: jest.fn(),
        updateStatusWithGuard: jest.fn(),
      };
      const reqApproval = new RequestPayrollApprovalUseCase(repo as any, stateMachine);
      await expect(
        reqApproval.execute("run-approved-1", "user-maker"),
      ).rejects.toThrow("Invalid payroll run transition: approved → pending_approval");
      expect(repo.transaction).not.toHaveBeenCalled();
    });

    it("validates PayrollPeriod status at DTO and UseCase layers and blocks editing a 'processing' period", async () => {
      const badCreateDto = plainToInstance(CreatePayrollPeriodDto, {
        code: "2026-11",
        name: "Nov 2026",
        startsOn: "2026-11-01",
        endsOn: "2026-11-30",
        status: "paid",
      });
      const createErrors = await validate(badCreateDto);
      expect(createErrors.some((e) => e.property === "status")).toBe(true);

      const badUpdateDto = plainToInstance(UpdatePayrollPeriodDto, {
        status: "invalid_status",
      });
      const updateErrors = await validate(badUpdateDto);
      expect(updateErrors.some((e) => e.property === "status")).toBe(true);

      const periodRepo = {
        findById: jest.fn().mockResolvedValue({
          id: "period-proc-1",
          startsOn: "2026-11-01",
          endsOn: "2026-11-30",
          status: "processing",
        }),
        update: jest.fn(),
      };
      const updateUseCase = new UpdatePayrollPeriodUseCase(
        periodRepo as any,
        new RequestContextService(),
      );

      await expect(
        updateUseCase.execute("period-proc-1", { name: "Tampered Name" }),
      ).rejects.toThrow(
        "Payroll period in 'processing' status cannot be modified while payroll calculation is in progress",
      );
      expect(periodRepo.update).not.toHaveBeenCalled();

      periodRepo.findById.mockResolvedValue({
        id: "period-open-1",
        startsOn: "2026-11-01",
        endsOn: "2026-11-30",
        status: "open",
      });
      await expect(
        updateUseCase.execute("period-open-1", { status: "bogus" }),
      ).rejects.toThrow(
        "Invalid payroll period status 'bogus'; allowed statuses on update are 'draft', 'open', or 'closed'",
      );
      expect(periodRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("2. P0 — P6D-002: Make Segregation of Duties Fail Closed", () => {
    it("records REQUESTED actor when User A generates a run and blocks User A from approving or posting that run", async () => {
      const recordedHistory: Array<{
        action: string;
        performedByUserId: string | null;
      }> = [];
      const txObj = { isTx: true };
      const repo = {
        findById: jest.fn().mockResolvedValue({
          id: "run-sod-1",
          payrollPeriodId: "period-1",
          branchId: null,
          status: "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        getPayrollPeriodById: jest.fn().mockResolvedValue({
          id: "period-1",
          startsOn: "2026-08-01",
          endsOn: "2026-08-31",
        }),
        getEmployeesForPayrollRun: jest.fn().mockResolvedValue([{ id: "emp-1" }]),
        getSalaryByEmployeeForPeriod: jest.fn().mockResolvedValue(
          new Map([["emp-1", { baseSalary: 10000000, currency: "VND" }]]),
        ),
        findActiveCalculationVersion: jest.fn().mockResolvedValue({
          id: "calc-v1",
          code: "v1.0",
        }),
        transaction: jest.fn(async (fn) => fn(txObj)),
        markRunProcessing: jest.fn().mockResolvedValue([{ id: "run-sod-1" }]),
        deleteRunItems: jest.fn().mockResolvedValue(undefined),
        deleteRunPayslips: jest.fn().mockResolvedValue(undefined),
        insertInputSnapshotsBatch: jest.fn().mockResolvedValue([]),
        createPayslips: jest
          .fn()
          .mockResolvedValue([{ id: "ps-1", employeeId: "emp-1" }]),
        createPayrollItems: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue({ id: "run-sod-1" }),
        markRunPendingApproval: jest.fn().mockResolvedValue(undefined),
        recordApprovalAction: jest.fn(
          async (_runId: string, action: string, userId: string | null) => {
            recordedHistory.push({ action, performedByUserId: userId });
          },
        ),
        getApprovalHistory: jest.fn(async () => recordedHistory),
        findPayslipsByRunId: jest.fn().mockResolvedValue([
          {
            id: "ps-1",
            employeeId: "emp-1",
            status: "draft",
            metadata: { calculationStatus: "CONFIRMED", isProvisional: false },
          },
        ]),
        updateStatusWithGuard: jest.fn().mockResolvedValue({ id: "run-sod-1" }),
      };
      const outbox = { stage: jest.fn().mockResolvedValue(undefined) };

      const generateUseCase = new GeneratePayrollRunUseCase(
        repo as any,
        { getEffectiveDailySummaries: jest.fn().mockResolvedValue([]) },
        {
          evaluate: jest.fn().mockReturnValue({
            payableMinutes: 0,
            payableOvertimeMinutes: 0,
            payableDayFraction: 1,
            blockedReasons: [],
            attendanceOutcome: "present",
          }),
        },
        { getAdjustmentDeltas: jest.fn().mockResolvedValue([]) },
        outbox as any,
        stateMachine,
      );

      const controller = new PayrollRunsController(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        generateUseCase,
        new ApprovePayrollRunUseCase(repo as any, stateMachine, outbox as any),
        {} as any,
        new RequestPayrollApprovalUseCase(repo as any, stateMachine),
        new PostPayrollRunUseCase(repo as any, stateMachine, outbox as any),
      );

      // User A generates the payroll run via controller
      await controller.generate("run-sod-1", { user: { id: "user-a" } });

      // Verify repo.update received txObj (fixing the self-deadlock) and REQUESTED was recorded for user-a
      expect(repo.update).toHaveBeenCalledWith(
        "run-sod-1",
        expect.objectContaining({ calculationVersionId: "calc-v1" }),
        txObj,
      );
      expect(recordedHistory).toEqual([
        { action: "REQUESTED", performedByUserId: "user-a" },
      ]);

      // Now run is in pending_approval; User A attempts to approve -> 403 Forbidden
      repo.findById.mockResolvedValue({
        id: "run-sod-1",
        payrollPeriodId: "period-1",
        branchId: null,
        status: "pending_approval",
        calculationVersionId: "calc-v1",
        calculationHash: "hash-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        controller.approve("run-sod-1", { user: { id: "user-a" } }),
      ).rejects.toThrow(/Segregation of Duties/);

      // User B (different user) approves -> succeeds
      await controller.approve("run-sod-1", { user: { id: "user-b" } });

      // User A attempts to post -> 403 Forbidden
      repo.findById.mockResolvedValue({
        id: "run-sod-1",
        payrollPeriodId: "period-1",
        branchId: null,
        status: "approved",
        approvedByUserId: "user-b",
        calculationVersionId: "calc-v1",
        calculationHash: "hash-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        controller.post("run-sod-1", { user: { id: "user-a" } }),
      ).rejects.toThrow(/Segregation of Duties/);

      // User B posts -> succeeds
      await controller.post("run-sod-1", { user: { id: "user-b" } });
    });

    it("fails closed when requester or actor identity is missing or 'system' across Request, Approve, Post, and PayrollDecisionHandler", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue({
          id: "run-no-history",
          status: "pending_approval",
          calculationVersionId: "v1",
          calculationHash: "h1",
        }),
        getApprovalHistory: jest.fn().mockResolvedValue([]), // No REQUESTED history!
        findPayslipsByRunId: jest.fn().mockResolvedValue([
          { id: "ps-1", metadata: { calculationStatus: "CONFIRMED" } },
        ]),
        transaction: jest.fn(),
      };
      const outbox = { stage: jest.fn() };
      const approveUseCase = new ApprovePayrollRunUseCase(
        repo as any,
        stateMachine,
        outbox as any,
      );
      const postUseCase = new PostPayrollRunUseCase(
        repo as any,
        stateMachine,
        outbox as any,
      );
      const reqUseCase = new RequestPayrollApprovalUseCase(
        repo as any,
        stateMachine,
      );

      // 1. Missing or 'system' approver fails closed
      await expect(
        approveUseCase.execute("run-no-history", "system"),
      ).rejects.toThrow("Approver identity is required to enforce Segregation of Duties");

      // 2. Missing REQUESTED history fails closed on approve
      await expect(
        approveUseCase.execute("run-no-history", "user-checker"),
      ).rejects.toThrow(
        "Approval requester identity is required to enforce Segregation of Duties",
      );

      // 3. Missing REQUESTED history fails closed on post
      repo.findById.mockResolvedValue({
        id: "run-no-history",
        status: "approved",
        calculationVersionId: "v1",
        calculationHash: "h1",
      });
      await expect(
        postUseCase.execute("run-no-history", "user-checker"),
      ).rejects.toThrow(
        "Approval requester identity is required to enforce Segregation of Duties",
      );

      // 4. 'system' requester fails closed on requestApproval
      repo.findById.mockResolvedValue({
        id: "run-no-history",
        status: "draft",
      });
      await expect(
        reqUseCase.execute("run-no-history", "system"),
      ).rejects.toThrow(
        "Approval requester identity is required to enforce Segregation of Duties",
      );
      expect(repo.transaction).not.toHaveBeenCalled();

      // 5. PayrollDecisionHandler fails closed when requester identity is missing or 'system' or matches history requester
      const txSpy = jest.fn();
      const dbMock = {
        query: {
          approvalRequests: {
            findFirst: jest.fn().mockResolvedValue({
              id: "apr-missing-req",
              requestedByUserId: null,
              metadata: { payrollRunId: "run-1" },
            }),
          },
          payrollRuns: {
            findFirst: jest.fn().mockResolvedValue({
              id: "run-1",
              status: "pending_approval",
            }),
          },
          payrollRunApprovalHistory: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          payslips: {
            findMany: jest.fn().mockResolvedValue([
              { id: "ps-1", metadata: { calculationStatus: "CONFIRMED" } },
            ]),
          },
        },
        transaction: txSpy,
      };
      const handler = new PayrollDecisionHandler(
        dbMock as any,
        new RequestContextService(),
      );

      // Missing requester in both approvalReq and history -> refused
      await handler.handleApproval({
        approvalRequestId: "apr-missing-req",
        decidedByUserId: "user-checker",
        decidedAt: new Date(),
      });
      expect(txSpy).not.toHaveBeenCalled();

      // History has REQUESTED by user-maker, and user-maker tries to approve via approval engine -> refused
      dbMock.query.payrollRunApprovalHistory.findMany.mockResolvedValue([
        { action: "REQUESTED", performedByUserId: "user-maker" },
      ]);
      await handler.handleApproval({
        approvalRequestId: "apr-missing-req",
        decidedByUserId: "user-maker",
        decidedAt: new Date(),
      });
      expect(txSpy).not.toHaveBeenCalled();
    });
  });

  describe("3. P0 — P6D-003: Remove Arbitrary Payslip Status Transitions", () => {
    it("rejects non-published target statuses at both DTO and UseCase layers and blocks republishing or reverting non-draft payslips", async () => {
      for (const badStatus of ["draft", "voided", "acknowledged", "unknown"]) {
        const dtoInstance = plainToInstance(PublishPayslipDto, {
          status: badStatus,
        });
        const errors = await validate(dtoInstance);
        expect(errors.some((e) => e.property === "status")).toBe(true);
      }

      const payslipsRepo = {
        findById: jest.fn().mockResolvedValue({
          id: "ps-1",
          employeeId: "emp-1",
          payrollRunId: "run-1",
          status: "published",
          payrollRun: { id: "run-1", status: "posted" },
          metadata: { calculationStatus: "CONFIRMED" },
        }),
        transaction: jest.fn(),
        update: jest.fn(),
      };
      const useCase = new PublishPayslipUseCase(
        payslipsRepo as any,
        new RequestContextService(),
        { stage: jest.fn() } as any,
      );

      // Attempting to revert a published payslip to 'draft' is rejected with 400
      await expect(
        useCase.execute("ps-1", { status: "draft" }),
      ).rejects.toThrow(
        "Invalid target payslip status 'draft'; publish endpoint only transitions payslips to 'published'",
      );

      // Attempting to re-publish an already published payslip is rejected with 409
      await expect(
        useCase.execute("ps-1", { status: "published" }),
      ).rejects.toThrow(
        "Payslip in 'published' status cannot be published; only 'draft' payslips can transition to 'published'",
      );

      // Attempting to publish an orphaned payslip with payrollRun === null is rejected with 409
      payslipsRepo.findById.mockResolvedValue({
        id: "ps-orphan",
        employeeId: "emp-1",
        payrollRunId: null,
        status: "draft",
        payrollRun: null,
        metadata: { calculationStatus: "CONFIRMED" },
      });
      await expect(
        useCase.execute("ps-orphan", { status: "published" }),
      ).rejects.toThrow(
        "Cannot publish payslip without an approved or posted parent payroll run",
      );
      expect(payslipsRepo.transaction).not.toHaveBeenCalled();
    });
  });

  describe("4. P1 — P6D-004: Atomic Parent-Run Lock & Transactional Final Settlement", () => {
    it("aborts upsertByEmployeeId when FOR UPDATE lock reveals parent payrollRun transitioned out of 'draft'", async () => {
      const txMock = {
        query: {
          employees: {
            findFirst: jest
              .fn()
              .mockResolvedValue({ id: "emp-1", branchId: null }),
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
            // Initial read sees 'draft'
            findFirst: jest.fn().mockResolvedValue({
              id: "run-race-1",
              payrollPeriodId: "period-1",
              status: "draft",
            }),
          },
          payslips: {
            findFirst: jest.fn(),
          },
        },
        // FOR UPDATE lock sees concurrent transition to 'approved'
        execute: jest
          .fn()
          .mockResolvedValue([{ id: "run-race-1", status: "approved" }]),
        update: jest.fn(),
        insert: jest.fn(),
      };
      const dbMock = {
        ...txMock,
        transaction: jest.fn(async (fn) => fn(txMock)),
      };

      const repo = new PayrollRepository(dbMock as any);
      await expect(
        repo.upsertByEmployeeId("emp-1", {
          salary: "20000000",
          effectiveFrom: "2026-06-01",
        }),
      ).rejects.toThrow(
        "Cannot modify payroll record belonging to a 'approved' payroll run",
      );
      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.execute).toHaveBeenCalledTimes(1);
      expect(txMock.insert).not.toHaveBeenCalled();
      expect(txMock.update).not.toHaveBeenCalled();
    });
  });

  describe("5. P1 — P6D-005: Audit and Error-Response Privacy & Coverage", () => {
    it("omits raw salary and components from UpsertSalaryStructureUseCase error details on invalid date range", async () => {
      const useCase = new UpsertSalaryStructureUseCase({
        list: jest.fn(),
      } as any);

      let caughtError: any;
      try {
        await useCase.execute({
          employeeId: "emp-secret-1",
          baseSalary: 95000000,
          currency: "VND",
          effectiveFrom: "2026-12-01",
          effectiveTo: "2026-01-01",
          components: [{ code: "exec_bonus", name: "Exec Bonus", amount: 50000000 }],
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeDefined();
      const serialized = JSON.stringify(caughtError.getResponse());
      expect(serialized).toContain("emp-secret-1");
      expect(serialized).not.toContain("95000000");
      expect(serialized).not.toContain("50000000");
      expect(serialized).not.toContain("exec_bonus");
    });

    it("extracts audit entityId from nested params and request body fallbacks and redacts insuranceNumber, totalGross, totalNet, and salaryCap", () => {
      // Nested route param priority: :allowanceId and :enrollmentId take precedence over :employeeId
      expect(
        extractAuditEntityId(null, {
          employeeId: "emp-1",
          allowanceId: "alw-123",
        }),
      ).toBe("alw-123");
      expect(
        extractAuditEntityId(null, {
          employeeId: "emp-1",
          enrollmentId: "si-456",
        }),
      ).toBe("si-456");

      // Body fallback on failed POST /salary-structures or POST /payroll-runs where params={} and response=null
      expect(
        extractAuditEntityId(null, {}, { employeeId: "emp-body-1", baseSalary: 50000000 }),
      ).toBe("emp-body-1");
      expect(
        extractAuditEntityId(null, {}, { payrollPeriodId: "period-body-1" }),
      ).toBe("period-body-1");

      // Verify @AuditLog metadata on EmployeeAllowancesController & EmployeeSocialInsuranceController
      for (const method of ["create", "update", "remove"] as const) {
        expect(
          Reflect.getMetadata(
            AUDIT_LOG_KEY,
            EmployeeAllowancesController.prototype[method],
          ),
        ).toEqual({
          action:
            method === "remove"
              ? "employee_allowance_delete"
              : `employee_allowance_${method}`,
          entity: "employee_allowance",
        });
        expect(
          Reflect.getMetadata(
            AUDIT_LOG_KEY,
            EmployeeSocialInsuranceController.prototype[method],
          ),
        ).toEqual({
          action:
            method === "remove"
              ? "employee_social_insurance_delete"
              : `employee_social_insurance_${method}`,
          entity: "employee_social_insurance",
        });
      }

      // Redaction of newly added financial and PII keys
      const redacted = redactSensitive({
        insuranceNumber: "BHXH-99887766",
        social_insurance_number: "BHXH-99887766",
        totalGross: "150000000",
        total_net: "120000000",
        grossAmount: "20000000",
        netAmount: "18000000",
        salaryCap: "36000000",
      }) as Record<string, unknown>;

      expect(redacted).toEqual({
        insuranceNumber: "[REDACTED]",
        social_insurance_number: "[REDACTED]",
        totalGross: "[REDACTED]",
        total_net: "[REDACTED]",
        grossAmount: "[REDACTED]",
        netAmount: "[REDACTED]",
        salaryCap: "[REDACTED]",
      });
    });
  });

  describe("6. P1 — P6D-006: Truthful Readiness & Strict Readiness Diagnostics", () => {
    it("returns 503 on GetStrictReadinessUseCase when mandatory adapters are noop/simulated and 200 when all adapters are configured", async () => {
      const dbHealth = {
        check: jest.fn().mockResolvedValue({ status: "up", latencyMs: 1 }),
      };
      const storage = {
        healthCheck: jest.fn().mockResolvedValue({ ok: true }),
      };
      const eventBus = {
        healthCheck: jest.fn().mockResolvedValue({ ok: true }),
      };
      const redisService = {
        getClientOrNull: jest
          .fn()
          .mockReturnValue({ ping: jest.fn().mockResolvedValue("PONG") }),
      };

      const faceService = new FacePresenceService();
      const emailService = new EmailDeliveryService();
      const smsService = new SmsDeliveryService();
      const pushService = new PushDeliveryService();

      const getReadiness = new GetReadinessUseCase(
        dbHealth as any,
        storage as any,
        eventBus as any,
        redisService as any,
        faceService,
        emailService,
        smsService,
        pushService,
      );
      const getStrictReadiness = new GetStrictReadinessUseCase(getReadiness);

      // 1. Default noop/simulated state: /ready reports status='ready', productionReady=false; /ready/strict throws 503
      const readyDefault = await getReadiness.execute();
      expect(readyDefault.status).toBe("ready");
      expect(readyDefault.productionReady).toBe(false);

      await expect(getStrictReadiness.execute()).rejects.toThrow(
        ServiceUnavailableException,
      );

      // 2. When adapters are configured and non-simulated, getDiagnostics() is queried dynamically and /ready/strict succeeds
      jest.spyOn(faceService, "getDiagnostics").mockReturnValue({
        provider: "rekognition" as any,
        configured: true,
        simulated: false,
        mode: "strict_fail_closed",
      });
      jest.spyOn(emailService, "getDiagnostics").mockReturnValue({
        channel: "email",
        provider: "ses" as any,
        configured: true,
        simulated: false,
      });
      jest.spyOn(smsService, "getDiagnostics").mockReturnValue({
        channel: "sms",
        provider: "twilio" as any,
        configured: true,
        simulated: false,
      });
      jest.spyOn(pushService, "getDiagnostics").mockReturnValue({
        channel: "push",
        provider: "fcm" as any,
        configured: true,
        simulated: false,
      });

      const readyConfigured = await getReadiness.execute();
      expect(readyConfigured.status).toBe("ready");
      expect(readyConfigured.productionReady).toBe(true);

      const strictResult = await getStrictReadiness.execute();
      expect(strictResult.productionReady).toBe(true);

      const sysHealth = new GetSystemHealthUseCase(
        {
          pingDatabase: jest.fn().mockResolvedValue(undefined),
          insertHealthCheck: jest.fn().mockResolvedValue(undefined),
        } as any,
        new RequestContextService(),
        redisService as any,
        storage as any,
        faceService,
        emailService,
        smsService,
        pushService,
      );
      const healthReport = await sysHealth.execute();
      expect(healthReport.overallStatus).toBe("healthy");
    });
  });

  describe("7. Live PostgreSQL Rolled-Back Integration Tests (P6D-001, P6D-002, P6D-003, P6D-004)", () => {
    it("proves GeneratePayrollRunUseCase with active calculation version does not deadlock on PostgreSQL, protects posted runs, and rolls back failed final-settlement writes atomically", async () => {
      const dbUrl = resolveTestDbUrl();
      const sqlClient = postgres(dbUrl, { max: 2, connect_timeout: 5 });
      const db = drizzle(sqlClient, { schema });

      try {
        await expect(
          db.transaction(async (txDb) => {
            await txDb.execute(sql`SELECT pg_advisory_xact_lock(20260601)`);
            // Seed user, employee, salary structure, active calc version, period, and draft run
            const [makerUser] = await txDb
              .insert(schema.users)
              .values({
                username: "p6e_maker",
                email: "p6e_maker@example.com",
                passwordHash: "hash",
              })
              .returning({ id: schema.users.id });
            const [checkerUser] = await txDb
              .insert(schema.users)
              .values({
                username: "p6e_checker",
                email: "p6e_checker@example.com",
                passwordHash: "hash",
              })
              .returning({ id: schema.users.id });
            const [emp] = await txDb
              .insert(schema.employees)
              .values({
                userId: makerUser!.id,
                firstName: "Phase6E",
                lastName: "Employee",
                employeeCode: "EMP-P6E-001",
                endDate: "2026-09-15",
              })
              .returning({ id: schema.employees.id });
            await txDb.insert(schema.salaryStructures).values({
              employeeId: emp!.id,
              baseSalary: "18000000",
              currency: "VND",
              effectiveFrom: "2026-01-01",
              isCurrent: true,
            });
            await txDb.insert(schema.payrollCalculationVersions).values({
              code: "v-p6e-active",
              name: "Phase 6E Active Calc Version",
              formulaConfig: {},
              status: "active",
              effectiveFrom: "2026-01-01",
            });
            const [period] = await txDb
              .insert(schema.payrollPeriods)
              .values({
                code: "2026-09-P6E",
                name: "Sep 2026 P6E",
                startsOn: "2026-09-01",
                endsOn: "2026-09-30",
                status: "open",
              })
              .returning({ id: schema.payrollPeriods.id });
            const [run] = await txDb
              .insert(schema.payrollRuns)
              .values({
                payrollPeriodId: period!.id,
                status: "draft",
              })
              .returning({ id: schema.payrollRuns.id });

            // Bind PayrollRunsRepository to txDb (nested transaction uses SAVEPOINT on the same Postgres connection;
            // if GeneratePayrollRunUseCase called this.db.update without passing tx, it would deadlock or fail)
            const runRepo = new PayrollRunsRepository(txDb as any);
            jest
              .spyOn(runRepo, "getEmployeesForPayrollRun")
              .mockResolvedValue([{ id: emp!.id } as any]);

            const outbox = { stage: jest.fn().mockResolvedValue(undefined) };
            const generateUseCase = new GeneratePayrollRunUseCase(
              runRepo,
              { getEffectiveDailySummaries: jest.fn().mockResolvedValue([]) },
              {
                evaluate: jest.fn().mockReturnValue({
                  payableMinutes: 0,
                  payableOvertimeMinutes: 0,
                  payableDayFraction: 1,
                  blockedReasons: [],
                  attendanceOutcome: "present",
                }),
              },
              { getAdjustmentDeltas: jest.fn().mockResolvedValue([]) },
              outbox as any,
              stateMachine,
            );

            // 1. Execute GeneratePayrollRunUseCase on live Postgres with an active calculation version -> succeeds without deadlock!
            const generatedDto = await generateUseCase.execute(
              run!.id,
              makerUser!.id,
            );
            expect(generatedDto.status).toBe("pending_approval");

            // Verify REQUESTED approval history row was persisted in PostgreSQL
            const historyRows = await runRepo.getApprovalHistory(run!.id);
            expect(historyRows).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  action: "REQUESTED",
                  performedByUserId: makerUser!.id,
                }),
              ]),
            );

            // 2. Verify makerUser cannot approve their own generated run (SoD enforced against live DB history)
            const approveUseCase = new ApprovePayrollRunUseCase(
              runRepo,
              stateMachine,
              outbox as any,
            );
            await expect(
              approveUseCase.execute(run!.id, makerUser!.id),
            ).rejects.toThrow(/Segregation of Duties/);

            // 3. Force run to 'posted' in DB and verify GeneratePayrollRunUseCase + markRunProcessing cannot overwrite it
            await txDb
              .update(schema.payrollRuns)
              .set({ status: "posted" })
              .where(eq(schema.payrollRuns.id, run!.id));
            await expect(
              generateUseCase.execute(run!.id, checkerUser!.id),
            ).rejects.toThrow("Payroll run cannot be regenerated after approval");

            const directMarkProcessingOnPosted = await runRepo.markRunProcessing(
              run!.id,
              txDb as any,
              "posted",
            );
            expect(directMarkProcessingOnPosted).toHaveLength(0);

            const stillPosted = await runRepo.findById(run!.id);
            expect(stillPosted?.status).toBe("posted");

            // 4. Verify PayslipsRepository.update with status='published' only updates 'draft' rows in PostgreSQL
            const payslipsRepo = new PayslipsRepository(txDb as any);
            const runPayslips = await runRepo.findPayslipsByRunId(run!.id);
            expect(runPayslips.length).toBeGreaterThan(0);
            const targetPayslipId = runPayslips[0]!.id;

            await txDb
              .update(schema.payslips)
              .set({ status: "voided" })
              .where(eq(schema.payslips.id, targetPayslipId));
            const publishVoidedResult = await payslipsRepo.update(
              targetPayslipId,
              { status: "published" },
              txDb as any,
            );
            expect(publishVoidedResult).toBeNull();

            // 5. Verify CalculateFinalSettlementUseCase rolls back payslip write inside a nested savepoint when item insertion fails mid-flight
            const payrollRepo = new PayrollRepository(txDb as any);
            jest
              .spyOn(payrollRepo as any, "makePayrollItem")
              .mockImplementationOnce(() => {
                throw new Error("SIMULATED_ITEM_INSERT_FAILURE");
              });

            const settlementWriter = {
              markProcessing: jest.fn().mockResolvedValue(undefined),
              markSettled: jest.fn().mockResolvedValue(undefined),
              markFailed: jest.fn().mockResolvedValue(undefined),
            };
            const settlementUseCase = new CalculateFinalSettlementUseCase(
              payrollRepo,
              {
                findEmployeeById: jest.fn().mockResolvedValue({
                  id: emp!.id,
                  endDate: "2026-06-15",
                }),
              },
              settlementWriter,
              new RequestContextService(),
            );

            await expect(
              settlementUseCase.execute({
                processId: "proc-rollback-1",
                employeeId: emp!.id,
              }),
            ).rejects.toThrow("SIMULATED_ITEM_INSERT_FAILURE");

            // Confirm no manual-2026-06 period or payslip remained in PostgreSQL after the failed settlement transaction
            const leakedPeriod = await txDb.query.payrollPeriods.findFirst({
              where: (p, { eq }) => eq(p.code, "manual-2026-06"),
            });
            expect(leakedPeriod).toBeUndefined();

            throw new Error("ROLLBACK_PHASE6E_INTENTIONAL");
          }),
        ).rejects.toThrow("ROLLBACK_PHASE6E_INTENTIONAL");
      } finally {
        await sqlClient.end();
      }
    });
  });
});
