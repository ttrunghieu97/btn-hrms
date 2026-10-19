import "reflect-metadata";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";
import postgres from "postgres";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { of, throwError } from "rxjs";
import { type Reflector } from "@nestjs/core";
import { CreatePayrollRunDto } from "../../../modules/payroll/payroll-runs/dto/create-payroll-run.dto";
import { UpdatePayrollRunDto } from "../../../modules/payroll/payroll-runs/dto/update-payroll-run.dto";
import {
  ApprovePayrollRunUseCase,
  CreatePayrollRunUseCase,
  PostPayrollRunUseCase,
  RejectPayrollRunUseCase,
  RequestPayrollApprovalUseCase,
  UpdatePayrollRunUseCase,
} from "../../../modules/payroll/payroll-runs/use-cases/payroll-runs.usecases";
import { PayrollRunStateMachine } from "../../../modules/payroll/payroll-runs/services/payroll-run-state-machine";
import { PayrollDecisionHandler } from "../../../integration/payroll-approval/payroll-decision.handler.service";
import { CreatePayrollPeriodUseCase } from "../../../modules/payroll/payroll-periods/use-cases/create-payroll-period.usecase";
import { UpdatePayrollPeriodUseCase } from "../../../modules/payroll/payroll-periods/use-cases/update-payroll-period.usecase";
import { PayrollRepository } from "../../../modules/payroll/payroll/repositories/payroll.repository";
import { UpsertPayrollUseCase } from "../../../modules/payroll/payroll/use-cases/upsert-payroll.usecase";
import { PublishPayslipUseCase } from "../../../modules/payroll/payslips/use-cases/publish-payslip.usecase";
import { redactSensitive } from "../../../shared/utils/redaction.util";
import {
  AuditLogInterceptor,
  extractAuditEntityId,
} from "../../../shared/interceptors/audit-log.interceptor";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { GetReadinessUseCase } from "../../../app/use-cases/get-readiness.usecase";
import { GetSystemHealthUseCase } from "../../../infrastructure/monitoring/system-health/use-cases/get-system-health.usecase";
import { FacePresenceService } from "../../../modules/attendance/attendances/services/face-presence.service";
import { EmailDeliveryService } from "../../../modules/platform-notifications/channels/email-delivery.service";
import { SmsDeliveryService } from "../../../modules/platform-notifications/channels/sms-delivery.service";
import { PushDeliveryService } from "../../../modules/platform-notifications/channels/push-delivery.service";
import { SendNotificationUseCase } from "../../../modules/platform-notifications/use-cases/send-notification.usecase";
import { NotificationDeliveryHandler } from "../../../modules/platform-notifications/handlers/notification-delivery.handler";
import { NotificationType } from "../../../modules/platform-notifications/dto/notification-template.dto";
import { NotificationDeliveryEvent } from "../../../core/events/events/notification-delivery.event";

describe("Phase 6C — Payroll Bypass, Immutability, Audit Redaction & Adapter Observability Suite", () => {
  const stateMachine = new PayrollRunStateMachine();

  describe("1. P0 — P6B-001: Prevent Payroll Status-Transition Bypass", () => {
    it("rejects creating a payroll run with status 'approved' or 'posted' at both DTO and UseCase layers", async () => {
      const approvedDto = plainToInstance(CreatePayrollRunDto, {
        payrollPeriodId: "550e8400-e29b-41d4-a716-446655440000",
        status: "approved",
      });
      const validationErrors = await validate(approvedDto);
      expect(validationErrors.some((e) => e.property === "status")).toBe(true);

      const repo = {
        findByPeriodAndBranch: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findById: jest.fn(),
      };
      const createUseCase = new CreatePayrollRunUseCase(repo as any);

      await expect(
        createUseCase.execute({
          payrollPeriodId: "550e8400-e29b-41d4-a716-446655440000",
          status: "approved",
        }),
      ).rejects.toThrow(
        "Cannot create payroll run in 'approved' status; new payroll runs must start in 'draft'",
      );

      await expect(
        createUseCase.execute({
          payrollPeriodId: "550e8400-e29b-41d4-a716-446655440000",
          status: "posted",
        }),
      ).rejects.toThrow(
        "Cannot create payroll run in 'posted' status; new payroll runs must start in 'draft'",
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("blocks the P6B-001 attack: PATCH /payroll-runs/:id cannot transition pending_approval -> approved or approved -> posted", async () => {
      // 1. UpdatePayrollRunDto strips status under ValidationPipe whitelist
      const updateInstance = plainToInstance(UpdatePayrollRunDto, {
        notes: "Updated notes",
        status: "approved",
      });
      const whitelistErrors = await validate(updateInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(whitelistErrors.some((e) => e.property === "status")).toBe(true);

      // 2. Even if status is passed directly to UpdatePayrollRunUseCase on a pending_approval run:
      const repo = {
        findById: jest
          .fn()
          .mockResolvedValue({ id: "run-1", status: "pending_approval" }),
        update: jest.fn(),
      };
      const updateUseCase = new UpdatePayrollRunUseCase(
        repo as any,
        stateMachine,
      );

      await expect(
        updateUseCase.execute("run-1", { status: "approved" } as any),
      ).rejects.toThrow(
        "Lifecycle status transition (pending_approval → approved) is not permitted via generic update; use the dedicated payroll run lifecycle endpoints",
      );
      expect(repo.update).not.toHaveBeenCalled();

      // 3. Attempting approved -> posted via UpdatePayrollRunUseCase is also blocked:
      repo.findById.mockResolvedValue({ id: "run-1", status: "approved" });
      await expect(
        updateUseCase.execute("run-1", { status: "posted" } as any),
      ).rejects.toThrow(
        "Lifecycle status transition (approved → posted) is not permitted via generic update; use the dedicated payroll run lifecycle endpoints",
      );
      expect(repo.update).not.toHaveBeenCalled();

      // 4. Attempting to edit notes/branchId on a non-draft (approved / pending_approval) run is rejected:
      await expect(
        updateUseCase.execute("run-1", { notes: "tamper" }),
      ).rejects.toThrow(
        "Payroll run in 'approved' status cannot be modified directly",
      );
      expect(repo.update).not.toHaveBeenCalled();

      // 5. Legitimate draft metadata update succeeds and strips any status field:
      repo.findById.mockResolvedValue({
        id: "run-draft",
        payrollPeriodId: "p-1",
        branchId: null,
        status: "draft",
        notes: "Valid draft note",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo.update.mockResolvedValue({ id: "run-draft" });
      const res = await updateUseCase.execute("run-draft", {
        notes: "Valid draft note",
      });
      expect(res.status).toBe("draft");
      expect(repo.update).toHaveBeenCalledWith("run-draft", {
        notes: "Valid draft note",
      });
    });

    it("enforces Segregation of Duties and provisional/empty payslip guards in PayrollDecisionHandler (approval engine integration path)", async () => {
      const updateMock = jest.fn();
      const dbMock = {
        query: {
          approvalRequests: {
            findFirst: jest.fn().mockResolvedValue({
              id: "apr-1",
              requestedByUserId: "user-requester",
              metadata: { payrollRunId: "run-1" },
            }),
          },
          payrollRuns: {
            findFirst: jest.fn().mockResolvedValue({
              id: "run-1",
              status: "pending_approval",
            }),
          },
          payslips: {
            findMany: jest.fn().mockResolvedValue([]),
          },
        },
        transaction: jest.fn(async (fn) =>
          fn({
            update: updateMock,
          }),
        ),
      };

      const handler = new PayrollDecisionHandler(
        dbMock as any,
        new RequestContextService(),
      );

      // 1. Blocks self-approval (Segregation of Duties)
      await handler.handleApproval({
        approvalRequestId: "apr-1",
        decidedByUserId: "user-requester",
        decidedAt: new Date(),
      });
      expect(dbMock.transaction).not.toHaveBeenCalled();

      // 2. Blocks approval when payroll run has 0 payslips
      await handler.handleApproval({
        approvalRequestId: "apr-1",
        decidedByUserId: "user-approver",
        decidedAt: new Date(),
      });
      expect(dbMock.transaction).not.toHaveBeenCalled();

      // 3. Blocks approval when payroll run has provisional payslips
      dbMock.query.payslips.findMany.mockResolvedValue([
        {
          id: "ps-1",
          metadata: {
            calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
            isProvisional: true,
          },
        },
      ]);
      await handler.handleApproval({
        approvalRequestId: "apr-1",
        decidedByUserId: "user-approver",
        decidedAt: new Date(),
      });
      expect(dbMock.transaction).not.toHaveBeenCalled();

      // 4. Blocks late rejection when payroll run is already approved/posted
      dbMock.query.payrollRuns.findFirst.mockResolvedValue({
        id: "run-1",
        status: "posted",
      });
      await handler.handleRejection({
        approvalRequestId: "apr-1",
        decidedByUserId: "user-approver",
        decidedAt: new Date(),
      });
      expect(dbMock.transaction).not.toHaveBeenCalled();
    });

    it("blocks creating or updating payroll periods directly into finalized ('paid'/'closed') status", async () => {
      const periodRepo = {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
      };
      const createPeriod = new CreatePayrollPeriodUseCase(
        periodRepo as any,
        new RequestContextService(),
      );
      await expect(
        createPeriod.execute({
          code: "2026-07",
          name: "July 2026",
          startsOn: "2026-07-01",
          endsOn: "2026-07-31",
          status: "paid",
        }),
      ).rejects.toThrow(
        "Cannot create payroll period in 'paid' status; new periods must start in 'draft' or 'open'",
      );

      const updatePeriod = new UpdatePayrollPeriodUseCase(
        periodRepo as any,
        new RequestContextService(),
      );
      periodRepo.findById.mockResolvedValue({
        id: "p-1",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
        status: "open",
      });
      await expect(
        updatePeriod.execute("p-1", { status: "paid" }),
      ).rejects.toThrow(
        "Cannot transition payroll period directly to 'paid' via generic update",
      );

      periodRepo.findById.mockResolvedValue({
        id: "p-1",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
        status: "closed",
      });
      await expect(
        updatePeriod.execute("p-1", { name: "Mutated Closed Period" }),
      ).rejects.toThrow("Payroll period in 'closed' status is immutable");
    });

    it("preserves valid authorized lifecycle transitions (request-approval -> approve -> post & reject) when non-provisional", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue({
          id: "run-valid",
          payrollPeriodId: "p-1",
          branchId: null,
          status: "processing",
          calculationVersionId: "v-confirmed",
          calculationHash: "hash-1234",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        getApprovalHistory: jest.fn().mockResolvedValue([
          { action: "REQUESTED", performedByUserId: "user-maker" },
        ]),
        findPayslipsByRunId: jest.fn().mockResolvedValue([
          {
            id: "ps-confirmed",
            employeeId: "emp-1",
            status: "draft",
            metadata: { calculationStatus: "CONFIRMED", isProvisional: false },
          },
        ]),
        transaction: jest.fn(async (fn) => fn({})),
        updateStatusWithGuard: jest.fn().mockResolvedValue({ id: "run-valid" }),
        recordApprovalAction: jest.fn().mockResolvedValue(undefined),
      };
      const outbox = { stage: jest.fn().mockResolvedValue(undefined) };

      const reqApproval = new RequestPayrollApprovalUseCase(
        repo as any,
        stateMachine,
      );
      await reqApproval.execute("run-valid", "user-maker");

      repo.findById.mockResolvedValue({
        id: "run-valid",
        payrollPeriodId: "p-1",
        branchId: null,
        status: "pending_approval",
        calculationVersionId: "v-confirmed",
        calculationHash: "hash-1234",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const approveUseCase = new ApprovePayrollRunUseCase(
        repo as any,
        stateMachine,
        outbox as any,
      );
      await approveUseCase.execute("run-valid", "user-checker");

      repo.findById.mockResolvedValue({
        id: "run-valid",
        payrollPeriodId: "p-1",
        branchId: null,
        status: "approved",
        calculationVersionId: "v-confirmed",
        calculationHash: "hash-1234",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const postUseCase = new PostPayrollRunUseCase(
        repo as any,
        stateMachine,
        outbox as any,
      );
      await postUseCase.execute("run-valid", "user-checker");
      expect(repo.updateStatusWithGuard).toHaveBeenCalledTimes(3);

      // Also verify RejectPayrollRunUseCase transitions pending_approval -> draft
      repo.findById.mockResolvedValue({
        id: "run-valid",
        payrollPeriodId: "p-1",
        branchId: null,
        status: "pending_approval",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const rejectUseCase = new RejectPayrollRunUseCase(
        repo as any,
        stateMachine,
        outbox as any,
      );
      await rejectUseCase.execute("run-valid", "user-checker", "Needs correction");
      expect(repo.updateStatusWithGuard).toHaveBeenCalledTimes(4);
    });
  });

  describe("2. P0 — P6B-002: Protect Payslip Immutability and Provisional Metadata", () => {
    function createPayrollTxMock(overrides: {
      payrollRunStatus?: string;
      existingPayslip?: Record<string, unknown> | null;
      updatedRowCount?: number;
    } = {}) {
      let capturedInsertValues: Record<string, unknown> | undefined;
      let capturedUpdateSet: Record<string, unknown> | undefined;
      let capturedItemsInsert: Record<string, unknown>[] | undefined;

      const existingPayslip =
        "existingPayslip" in overrides ? overrides.existingPayslip : null;

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
            findFirst: jest.fn().mockResolvedValue({
              id: "run-1",
              payrollPeriodId: "period-1",
              status: overrides.payrollRunStatus ?? "draft",
            }),
          },
          payslips: {
            findFirst: jest
              .fn()
              .mockResolvedValueOnce(existingPayslip)
              .mockResolvedValue({
                id: (existingPayslip as any)?.id ?? "ps-new-1",
                employeeId: "emp-1",
                payrollRunId: "run-1",
                grossPay: "15000000.00",
                totalDeductions: "0.00",
                netPay: "15000000.00",
                currency: "VND",
                status: "draft",
                payrollItems: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
          },
        },
        insert: jest.fn(() => ({
          values: jest.fn((vals: unknown) => {
            if (Array.isArray(vals)) {
              capturedItemsInsert = vals as Record<string, unknown>[];
              return Promise.resolve(undefined);
            }
            capturedInsertValues = vals as Record<string, unknown>;
            return {
              returning: jest.fn().mockResolvedValue([{ id: "ps-new-1" }]),
            };
          }),
        })),
        update: jest.fn(() => ({
          set: jest.fn((vals: Record<string, unknown>) => {
            capturedUpdateSet = vals;
            return {
              where: jest.fn(() => ({
                returning: jest
                  .fn()
                  .mockResolvedValue(
                    overrides.updatedRowCount === 0
                      ? []
                      : [{ id: (existingPayslip as any)?.id ?? "ps-1" }],
                  ),
              })),
            };
          }),
        })),
        delete: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(undefined),
        })),
      };

      return {
        txMock,
        getCapturedInsertValues: () => capturedInsertValues,
        getCapturedUpdateSet: () => capturedUpdateSet,
        getCapturedItemsInsert: () => capturedItemsInsert,
      };
    }

    it("marks newly created legacy-upsert payslips with explicit provisional metadata and blocks publishing them", async () => {
      const { txMock, getCapturedInsertValues } = createPayrollTxMock({
        existingPayslip: null,
      });
      const repo = new PayrollRepository(txMock as any);

      await repo.upsertByEmployeeId(
        "emp-1",
        {
          salary: "15000000",
          effectiveFrom: "2026-06-01",
        },
        txMock as any,
      );

      const inserted = getCapturedInsertValues();
      expect(inserted).toBeDefined();
      expect(inserted?.status).toBe("draft");
      expect(inserted?.metadata).toEqual(
        expect.objectContaining({
          source: "legacy-payroll-upsert",
          calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
          isProvisional: true,
          requiresManualReviewBeforePublish: true,
          policyBlockerCode: "BIZ_004_PAYROLL_POLICY_UNCONFIRMED",
        }),
      );

      // Attempting to publish that newly created payslip via PublishPayslipUseCase is rejected:
      const publishUseCase = new PublishPayslipUseCase(
        {
          findById: jest.fn().mockResolvedValue({
            id: "ps-new-1",
            employeeId: "emp-1",
            payrollRunId: "run-1",
            status: "draft",
            metadata: inserted?.metadata,
          }),
          transaction: jest.fn(),
          update: jest.fn(),
        } as any,
        new RequestContextService(),
        { stage: jest.fn() } as any,
      );

      await expect(
        publishUseCase.execute("ps-new-1", { status: "published" }),
      ).rejects.toThrow(
        "Provisionalfinal-settlement", // wait: let's check exact message below
      ).catch(() => undefined);

      await expect(
        publishUseCase.execute("ps-new-1", { status: "published" }),
      ).rejects.toThrow(/Provisional .* payslip cannot be published/);
    });

    it("rejects updating published/finalized payslips or payslips in approved/posted/pending_approval runs", async () => {
      // 1. Published payslip cannot be mutated
      const { txMock: pubTx } = createPayrollTxMock({
        existingPayslip: {
          id: "ps-published-1",
          employeeId: "emp-1",
          payrollRunId: "run-1",
          status: "published",
          metadata: {},
          payrollItems: [],
        },
      });
      const pubRepo = new PayrollRepository(pubTx as any);
      await expect(
        pubRepo.upsertByEmployeeId(
          "emp-1",
          { salary: "99000000" },
          pubTx as any,
        ),
      ).rejects.toThrow(
        "Payslip in 'published' status is immutable and cannot be overwritten",
      );
      expect(pubTx.update).not.toHaveBeenCalled();

      // 2. Payslip belonging to approved or posted payroll run cannot be mutated
      for (const runStatus of ["approved", "posted", "pending_approval"]) {
        const { txMock: runTx } = createPayrollTxMock({
          payrollRunStatus: runStatus,
        });
        const runRepo = new PayrollRepository(runTx as any);
        await expect(
          runRepo.upsertByEmployeeId(
            "emp-1",
            { salary: "99000000" },
            runTx as any,
          ),
        ).rejects.toThrow(
          `Cannot modify payroll record belonging to a '${runStatus}' payroll run`,
        );
        expect(runTx.update).not.toHaveBeenCalled();
        expect(runTx.insert).not.toHaveBeenCalled();
      }
    });

    it("prevents partial updates from clearing provisional flags, calculationVersionId/hash, or existing item amounts", async () => {
      const { txMock, getCapturedUpdateSet, getCapturedItemsInsert } =
        createPayrollTxMock({
          existingPayslip: {
            id: "ps-prov-1",
            employeeId: "emp-1",
            payrollRunId: "run-1",
            status: "draft",
            currency: "VND",
            metadata: {
              source: "offboarding-final-settlement",
              calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
              isProvisional: true,
              settlementComplete: false,
              requiresManualReviewBeforePublish: true,
              policyBlockerCode: "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED",
              omittedComponents: ["unused_leave_payout"],
              calcVersion: "v1.2",
              calculationVersionId: "ver-uuid-1",
              calculationHash: "hash-abc",
            },
            payrollItems: [
              { code: "base_salary", amount: "10000000" },
              { code: "bonus", amount: "2000000" },
              { code: "allowance", amount: "500000" },
            ],
          },
        });

      const repo = new PayrollRepository(txMock as any);

      // Attempt to clear safety flags via values.metadata while only updating salary
      await repo.upsertByEmployeeId(
        "emp-1",
        {
          salary: "12000000",
          metadata: {
            isProvisional: false,
            calculationStatus: "CONFIRMED",
            settlementComplete: true,
            requiresManualReviewBeforePublish: false,
            policyBlockerCode: "",
            omittedComponents: [],
            calcVersion: null,
            calculationVersionId: null,
            calculationHash: null,
          },
        },
        txMock as any,
      );

      const updated = getCapturedUpdateSet();
      expect(updated?.metadata).toEqual(
        expect.objectContaining({
          calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED",
          isProvisional: true,
          settlementComplete: false,
          requiresManualReviewBeforePublish: true,
          policyBlockerCode: "BIZ_005_FINAL_SETTLEMENT_POLICY_UNCONFIRMED",
          omittedComponents: ["unused_leave_payout"],
          calcVersion: "v1.2",
          calculationVersionId: "ver-uuid-1",
          calculationHash: "hash-abc",
        }),
      );

      // Verify existing bonus (2000000) and allowance (500000) were preserved on partial update
      const items = getCapturedItemsInsert() ?? [];
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "base_salary", amount: "12000000" }),
          expect.objectContaining({ code: "bonus", amount: "2000000" }),
          expect.objectContaining({ code: "allowance", amount: "500000" }),
        ]),
      );
    });

    it("rejects concurrent draft update when payslip status changes concurrently (0 rows updated by WHERE status = 'draft')", async () => {
      const { txMock } = createPayrollTxMock({
        existingPayslip: {
          id: "ps-race-1",
          employeeId: "emp-1",
          payrollRunId: "run-1",
          status: "draft",
          metadata: {},
          payrollItems: [],
        },
        updatedRowCount: 0,
      });
      const repo = new PayrollRepository(txMock as any);

      await expect(
        repo.upsertByEmployeeId("emp-1", { salary: "15000000" }, txMock as any),
      ).rejects.toThrow(
        "Payslip status changed concurrently and can no longer be modified",
      );
    });

    it("blocks publishing a payslip when its parent payrollRun is still in draft/pending_approval", async () => {
      const publishUseCase = new PublishPayslipUseCase(
        {
          findById: jest.fn().mockResolvedValue({
            id: "ps-unapproved-run",
            employeeId: "emp-1",
            payrollRunId: "run-draft-1",
            status: "draft",
            payrollRun: { id: "run-draft-1", status: "pending_approval" },
            metadata: { calculationStatus: "CONFIRMED", isProvisional: false },
          }),
          transaction: jest.fn(),
          update: jest.fn(),
        } as any,
        new RequestContextService(),
        { stage: jest.fn() } as any,
      );

      await expect(
        publishUseCase.execute("ps-unapproved-run", { status: "published" }),
      ).rejects.toThrow(
        "Cannot publish payslip while parent payroll run is in 'pending_approval' status",
      );
    });
  });

  describe("3. P1 — P6B-003: Audit-Log Confidentiality and Completeness", () => {
    it("redacts compensation fields across camelCase, snake_case, kebab-case, nested objects, arrays, and ValidationError targets", () => {
      const payload = {
        employeeId: "emp-1",
        salary: "25000000",
        base_salary: "25000000",
        baseSalary: "25000000",
        "base-salary": "25000000",
        bonus: "3000000",
        deduction: "500000",
        total_deductions: "1500000",
        allowance: "1000000",
        overtime_amount: "800000",
        tax_amount: "1200000",
        insurance_amount: "900000",
        net_salary: "26200000",
        gross_pay: "29800000",
        net_pay: "26200000",
        prorated_salary: "12500000",
        hourly_rate: "150000",
        nested: {
          items: [
            { code: "base_salary", netPay: "26200000", grossPay: "29800000" },
          ],
        },
        validationError: {
          property: "salary",
          value: "25000000",
          target: { salary: "25000000", bonus: "3000000" },
          constraints: { matches: "Invalid salary" },
        },
      };

      const redacted = redactSensitive(payload) as Record<string, any>;
      expect(redacted.employeeId).toBe("emp-1");
      expect(redacted.salary).toBe("[REDACTED]");
      expect(redacted.base_salary).toBe("[REDACTED]");
      expect(redacted.baseSalary).toBe("[REDACTED]");
      expect(redacted["base-salary"]).toBe("[REDACTED]");
      expect(redacted.bonus).toBe("[REDACTED]");
      expect(redacted.deduction).toBe("[REDACTED]");
      expect(redacted.total_deductions).toBe("[REDACTED]");
      expect(redacted.allowance).toBe("[REDACTED]");
      expect(redacted.overtime_amount).toBe("[REDACTED]");
      expect(redacted.tax_amount).toBe("[REDACTED]");
      expect(redacted.insurance_amount).toBe("[REDACTED]");
      expect(redacted.net_salary).toBe("[REDACTED]");
      expect(redacted.gross_pay).toBe("[REDACTED]");
      expect(redacted.net_pay).toBe("[REDACTED]");
      expect(redacted.prorated_salary).toBe("[REDACTED]");
      expect(redacted.hourly_rate).toBe("[REDACTED]");
      expect(redacted.nested.items[0].netPay).toBe("[REDACTED]");
      expect(redacted.nested.items[0].grossPay).toBe("[REDACTED]");
      expect(redacted.validationError.target).toBe("[REDACTED]");
      expect(redacted.validationError.value).toBe("[REDACTED]");
    });

    it("extracts entityId from :employeeId and other nonstandard route params and redacts payroll audit logs on both success and failure", async () => {
      expect(
        extractAuditEntityId(null, { employeeId: "emp-999" }),
      ).toBe("emp-999");
      expect(
        extractAuditEntityId(null, { allowanceId: "alw-777" }),
      ).toBe("alw-777");

      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue({
          action: "payroll_upsert",
          entity: "payroll",
        }),
      } as unknown as Reflector;
      const auditPort = { write: jest.fn().mockResolvedValue(undefined) };
      const interceptor = new AuditLogInterceptor(
        reflector,
        auditPort as any,
        new RequestContextService(),
      );

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: "actor-1" },
            params: { employeeId: "emp-456" },
            query: {},
            body: {
              salary: "30000000",
              bonus: "5000000",
              netSalary: "32000000",
              components: [{ code: "housing", amount: "2000000" }],
            },
          }),
        }),
      } as any;

      const errWithTarget = Object.assign(new Error("Validation failed"), {
        status: 400,
        response: {
          message: "Bad Request",
          body: { salary: "30000000" },
          target: { salary: "30000000" },
          details: [
            {
              property: "salary",
              value: "30000000",
              target: { salary: "30000000" },
              constraints: { isString: "must be string" },
            },
          ],
        },
      });

      await expect(
        new Promise<void>((resolve, reject) => {
          interceptor
            .intercept(context, {
              handle: () => throwError(() => errWithTarget),
            } as any)
            .subscribe({
              next: () => undefined,
              error: reject,
              complete: resolve,
            });
        }),
      ).rejects.toThrow("Validation failed");

      await Promise.resolve();

      expect(auditPort.write).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: "actor-1",
          action: "payroll_upsert",
          entity: "payroll",
          entityId: "emp-456",
          metadata: expect.objectContaining({
            success: false,
            body: {
              salary: "[REDACTED]",
              bonus: "[REDACTED]",
              netSalary: "[REDACTED]",
              components: "[REDACTED]",
            },
            error: expect.objectContaining({
              response: expect.objectContaining({
                details: [
                  expect.objectContaining({
                    property: "salary",
                    value: "[REDACTED]",
                    target: "[REDACTED]",
                  }),
                ],
              }),
            }),
          }),
        }),
      );
      const writtenErrorResp =
        auditPort.write.mock.calls[0][0].metadata.error.response;
      expect(writtenErrorResp.body).toBeUndefined();
      expect(writtenErrorResp.target).toBeUndefined();
    });
  });

  describe("4. P1 — P6B-004: Adapter Observability & Simulated Delivery Status", () => {
    it("surfaces noop face-presence and simulated notification providers in GetReadinessUseCase and GetSystemHealthUseCase", async () => {
      const readinessUseCase = new GetReadinessUseCase(
        { check: jest.fn().mockResolvedValue({ status: "up", latencyMs: 2 }) } as any,
        { healthCheck: jest.fn().mockResolvedValue({ ok: true }) } as any,
        { healthCheck: jest.fn().mockResolvedValue({ ok: true }) } as any,
        {
          getClientOrNull: jest
            .fn()
            .mockReturnValue({ ping: jest.fn().mockResolvedValue("PONG") }),
        } as any,
      );

      const readiness = await readinessUseCase.execute();
      expect(readiness.status).toBe("ready");
      expect(readiness.adapters).toEqual(
        expect.objectContaining({
          facePresence: expect.objectContaining({
            provider: "noop",
            configured: false,
            simulated: true,
          }),
          notifications: expect.objectContaining({
            email: { provider: "simulated", configured: false, simulated: true },
            sms: { provider: "simulated", configured: false, simulated: true },
            push: { provider: "simulated", configured: false, simulated: true },
          }),
        }),
      );

      const systemHealthUseCase = new GetSystemHealthUseCase(
        {
          pingDatabase: jest.fn().mockResolvedValue(undefined),
          insertHealthCheck: jest.fn().mockResolvedValue(undefined),
        } as any,
        new RequestContextService(),
        {
          getClientOrNull: jest
            .fn()
            .mockReturnValue({ ping: jest.fn().mockResolvedValue("PONG") }),
        } as any,
        { healthCheck: jest.fn().mockResolvedValue({ ok: true }) } as any,
      );

      const health = await systemHealthUseCase.execute();
      expect(health.overallStatus).toBe("degraded");
      expect(health.components).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "face_presence",
            status: "degraded",
          }),
          expect.objectContaining({
            name: "notification_delivery",
            status: "degraded",
          }),
        ]),
      );
    });

    it("distinguishes queued, simulated, sent_to_provider, delivered, failed, and unknown notification states without marking simulated sends as 'sent'", async () => {
      // 1. SendNotificationUseCase records 'delivered' for IN_APP and 'queued' for EMAIL
      const insertedInputs: any[] = [];
      const notifRepo = {
        findUserIdentities: jest
          .fn()
          .mockResolvedValue([{ id: "u-1", email: "u1@example.com" }]),
        findPreferencesBatch: jest.fn().mockResolvedValue([
          {
            userId: "u-1",
            emailEnabled: true,
            smsEnabled: true,
            pushEnabled: true,
          },
        ]),
        insertNotifications: jest.fn(async (inputs: any[]) => {
          insertedInputs.push(...inputs);
          return inputs.map((inp, idx) => ({ id: `notif-${idx + 1}`, ...inp }));
        }),
        findNotificationById: jest.fn().mockResolvedValue({
          id: "notif-1",
          metadata: { requestedType: "email", effectiveType: "email", deliveryState: "queued" },
        }),
        updateNotification: jest.fn().mockResolvedValue(undefined),
      };
      const outbox = { stage: jest.fn().mockResolvedValue(undefined) };
      const sendUseCase = new SendNotificationUseCase(
        notifRepo as any,
        outbox as any,
      );

      await sendUseCase.executeBatch([
        {
          userId: "u-1",
          preferredType: NotificationType.IN_APP,
          subject: "In-app notice",
          body: "Hello in-app",
        },
        {
          userId: "u-1",
          preferredType: NotificationType.EMAIL,
          subject: "Email notice",
          body: "Hello email",
        },
      ]);

      expect(insertedInputs[0]).toEqual(
        expect.objectContaining({
          status: "sent",
          metadata: expect.objectContaining({
            provider: "in_app",
            deliveryState: "delivered",
            simulated: false,
          }),
        }),
      );
      expect(insertedInputs[1]).toEqual(
        expect.objectContaining({
          status: "pending",
          sentAt: null,
          metadata: expect.objectContaining({
            provider: "pending",
            deliveryState: "queued",
            simulated: false,
          }),
        }),
      );

      // 2. NotificationDeliveryHandler keeps status='pending' and sentAt=null for simulated providers
      const handlers = new Map<string, (event: any) => Promise<void>>();
      const eventBus = {
        on: jest.fn((evt: string, fn: (event: any) => Promise<void>) => {
          handlers.set(evt, fn);
        }),
      };
      const emailService = new EmailDeliveryService();
      const smsService = new SmsDeliveryService();
      const pushService = new PushDeliveryService();

      const deliveryHandler = new NotificationDeliveryHandler(
        eventBus as any,
        emailService,
        smsService,
        pushService,
        notifRepo as any,
      );
      deliveryHandler.onModuleInit();

      const onDelivery = handlers.get(NotificationDeliveryEvent.eventType)!;
      await onDelivery(
        new NotificationDeliveryEvent({
          notificationId: "notif-1",
          userId: "u-1",
          type: NotificationType.EMAIL,
          email: "u1@example.com",
          subject: "Simulated Subject",
          body: "Simulated Body",
        }),
      );

      expect(notifRepo.updateNotification).toHaveBeenCalledWith(
        "notif-1",
        expect.objectContaining({
          status: "pending",
          sentAt: null,
          metadata: expect.objectContaining({
            provider: "simulated",
            simulated: true,
            deliveryState: "simulated",
            externalDelivery: false,
          }),
        }),
      );

      // 3. Real external provider marks status='sent' and deliveryState='sent_to_provider'
      jest.spyOn(emailService, "sendEmail").mockResolvedValueOnce({
        provider: "ses",
        simulated: false,
        deliveryState: "sent_to_provider",
        externalDelivery: true,
      });
      await onDelivery(
        new NotificationDeliveryEvent({
          notificationId: "notif-1",
          userId: "u-1",
          type: NotificationType.EMAIL,
          email: "u1@example.com",
          subject: "Real Subject",
          body: "Real Body",
        }),
      );

      expect(notifRepo.updateNotification).toHaveBeenLastCalledWith(
        "notif-1",
        expect.objectContaining({
          status: "sent",
          sentAt: expect.any(Date),
          metadata: expect.objectContaining({
            provider: "ses",
            simulated: false,
            deliveryState: "sent_to_provider",
            externalDelivery: true,
          }),
        }),
      );

      // 4. Missing email on EMAIL channel marks status='failed' and deliveryState='failed'
      await onDelivery(
        new NotificationDeliveryEvent({
          notificationId: "notif-1",
          userId: "u-1",
          type: NotificationType.EMAIL,
          email: undefined,
          subject: "Missing Email",
          body: "Body",
        }),
      );
      expect(notifRepo.updateNotification).toHaveBeenLastCalledWith(
        "notif-1",
        expect.objectContaining({
          status: "failed",
          sentAt: null,
          metadata: expect.objectContaining({
            deliveryState: "failed",
            deliveryError: "Missing recipient email address",
          }),
        }),
      );
    });
  });

  describe("5. Database-Backed PostgreSQL Integration Test for Payroll Run & Payslip Concurrency Guards", () => {
    it("verifies optimistic status guards on payroll_runs and payslips against live PostgreSQL inside a rolled-back transaction", async () => {
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
      expect(dbUrl).toBeDefined();

      const sql = postgres(dbUrl!, { max: 1, connect_timeout: 3 });
      try {
        await expect(
          sql.begin(async (tx) => {
            await tx.unsafe("SELECT pg_advisory_xact_lock(20260601)");
            const [user] = await tx.unsafe<{ id: string }[]>(`
              INSERT INTO users (username, email, password_hash)
              VALUES ('phase6c_pg_user', 'phase6c_pg@example.com', 'hash')
              RETURNING id
            `);
            const [emp] = await tx.unsafe<{ id: string }[]>(
              `
              INSERT INTO employees (user_id, first_name, last_name, employee_code)
              VALUES ($1, 'Phase6C', 'Tester', 'EMP-PHASE6C-001')
              RETURNING id
            `,
              [user!.id],
            );
            const [period] = await tx.unsafe<{ id: string }[]>(`
              INSERT INTO payroll_periods (code, name, starts_on, ends_on, status)
              VALUES ('2026-10-P6C', 'Oct 2026 P6C', '2026-10-01', '2026-10-31', 'open')
              RETURNING id
            `);
            const [run] = await tx.unsafe<{ id: string; status: string }[]>(
              `
              INSERT INTO payroll_runs (payroll_period_id, status)
              VALUES ($1, 'draft')
              RETURNING id, status
            `,
              [period!.id],
            );
            const [payslip] = await tx.unsafe<{ id: string; status: string }[]>(
              `
              INSERT INTO payslips (payroll_run_id, employee_id, gross_pay, total_deductions, net_pay, currency, status, metadata)
              VALUES ($1, $2, 15000000, 0, 15000000, 'VND', 'published', '{"calculationStatus":"CONFIRMED"}'::jsonb)
              RETURNING id, status
            `,
              [run!.id, emp!.id],
            );

            // 1. Concurrent draft-only update guard (WHERE id = $1 AND status = 'draft') must affect 0 rows on a published payslip
            const draftUpdateOnPublished = await tx.unsafe<{ id: string }[]>(
              `
              UPDATE payslips
              SET gross_pay = 99000000, net_pay = 99000000
              WHERE id = $1 AND status = 'draft'
              RETURNING id
            `,
              [payslip!.id],
            );
            expect(draftUpdateOnPublished).toHaveLength(0);

            const [unchangedPayslip] = await tx.unsafe<{ gross_pay: string }[]>(
              `SELECT gross_pay FROM payslips WHERE id = $1`,
              [payslip!.id],
            );
            expect(Number(unchangedPayslip?.gross_pay)).toBe(15000000);

            // 2. Concurrent status guard on payroll_runs (WHERE id = $1 AND status = 'pending_approval') must affect 0 rows when run is in 'draft'
            const prematureApprove = await tx.unsafe<{ id: string }[]>(
              `
              UPDATE payroll_runs
              SET status = 'approved'
              WHERE id = $1 AND status = 'pending_approval'
              RETURNING id
            `,
              [run!.id],
            );
            expect(prematureApprove).toHaveLength(0);

            throw new Error("ROLLBACK_PHASE6C_INTENTIONAL");
          }),
        ).rejects.toThrow("ROLLBACK_PHASE6C_INTENTIONAL");
      } finally {
        await sql.end();
      }
    });
  });
});
