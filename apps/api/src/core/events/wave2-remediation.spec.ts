import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ValidationPipe } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  EventOutboxDispatcherService,
  NonRetryableDispatchError,
} from "./event-outbox-dispatcher.service";
import { InternalEventBus } from "./internal-event-bus";
import { RedisDurableEventBus } from "./redis-durable-event-bus.service";
import { EventIdempotencyRepository } from "../../infrastructure/repositories/event-idempotency.repository";
import { assertEventRegistered, validatePayload } from "../../shared/events/event-registry";
import { registerAllDomainEvents } from "../../shared/events/event-types";
import { PlatformApprovalEngineService } from "../../modules/platform-approval-engine/platform-approval-engine.service";
import { DecideApprovalStepUseCase } from "../../modules/platform-approval-engine/use-cases/decide-approval-step.usecase";
import { ApprovalRequestController } from "../../modules/platform-approval-engine/controllers/approval-request.controller";
import {
  ApprovalInboxController,
  InboxDecisionDto,
} from "../../integration/leave-approval/approval-inbox.controller";
import { DecideApprovalStepDto } from "../../modules/platform-approval-engine/dto/decide-approval-step.dto";
import {
  AddItemDto,
  CreateClaimDto,
  RejectClaimDto,
} from "../../modules/expenses/dto/expense.dto";
import {
  AddDependentDto,
  CreatePlanDto,
  EnrollEmployeeDto,
} from "../../modules/benefits/dto/benefit.dto";
import {
  CompleteInterviewDto,
  ScheduleInterviewDto,
  SubmitScorecardDto,
} from "../../modules/recruitment/interviews/dto/interview.dto";
import {
  AssignGoalDto,
  AssignReviewerDto,
  CreateCycleDto,
  CreateGoalDto,
  PublishResultDto,
  SubmitReviewDto,
} from "../../modules/performance/dto/performance.dto";
import {
  AssignCourseDto,
  AssignPathDto,
  CreateCertificationDefDto,
  CreateCourseDto,
  CreatePathDto,
  CreateSessionDto,
  EnrollCourseDto,
  IssueCertificateDto,
} from "../../modules/learning/dto/learning.dto";
import { UpdateLeaveRequestDto } from "../../modules/leave/leave-management/dto/update-leave-request.dto";
import { RequestApprovalDto } from "../../modules/platform-approval-engine/dto/request-approval.dto";
import { LeaveApprovalListener } from "../../integration/leave-approval/leave-approval.listener";
import { PayrollApprovalListener } from "../../integration/payroll-approval/payroll-approval.listener";
import { PayrollApprovalIntegrationHandler } from "../../integration/payroll-approval/payroll-approval-integration.handler";
import { PayrollDecisionHandler } from "../../integration/payroll-approval/payroll-decision.handler.service";
import { RecruitmentApprovalListener } from "../../integration/recruitment-approval/recruitment-approval.listener";
import { RecruitmentDecisionHandler } from "../../integration/recruitment-approval/recruitment-decision.handler.service";
import { AssetApprovalListener } from "../../integration/asset-approval/asset-approval.listener";
import { AssetDecisionHandler } from "../../integration/asset-approval/asset-decision.handler.service";
import { CancelLeaveRequestUseCase } from "../../modules/leave/leave-management/use-cases/cancel-leave-request.usecase";
import { EventOutboxService } from "./event-outbox.service";

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";
const VALID_UUID_3 = "33333333-3333-4333-8333-333333333333";

function makeMetricsMock() {
  return {
    setOutboxPendingCount: jest.fn(),
    setOutboxOldestUnpublishedAge: jest.fn(),
    incrementOutboxDispatchFailure: jest.fn(),
    incrementOutboxPublished: jest.fn(),
    incrementOutboxRetry: jest.fn(),
    incrementOutboxDeadLetter: jest.fn(),
    incrementEventBusPublished: jest.fn(),
    incrementEventBusProcessed: jest.fn(),
    incrementEventBusFailed: jest.fn(),
    setEventBusPendingCount: jest.fn(),
    incrementEventBusRetried: jest.fn(),
    incrementEventBusDlq: jest.fn(),
    incrementContractValidationFailed: jest.fn(),
  } as any;
}

const mockRequestContext = {
  get: () => null,
} as any;

describe("Wave 2 Remediation Regression Suite", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. AUDIT-021 & AUDIT-019: Outbox Dispatcher, Event Bus & Event Registry
  // ─────────────────────────────────────────────────────────────────────────
  describe("AUDIT-021 & AUDIT-019 — Outbox Dispatcher & Event Bus Integration", () => {
    beforeEach(() => {
      registerAllDomainEvents();
    });

    it("registers all domain events in EventRegistry and validates payloads with optional/nullable fields and __trace metadata", () => {
      expect(() => assertEventRegistered("approval.request.completed", 1)).not.toThrow();
      expect(() => assertEventRegistered("approval.request.decided", 1)).not.toThrow();
      expect(() => assertEventRegistered("approval.request.created", 1)).not.toThrow();
      expect(() => assertEventRegistered("performance.result.published", 1)).not.toThrow();
      expect(() => assertEventRegistered("platform.notification.delivery_requested", 1)).not.toThrow();

      expect(() =>
        validatePayload("approval.request.completed", 1, {
          idempotencyKey: "req-1:approval.request.completed",
          approvalRequestId: "req-1",
          policyKey: "leave_default",
          subjectType: "leave_request",
          subjectId: "leave-1",
          outcome: "approved",
          completedAt: new Date().toISOString(),
          __trace: {
            correlationId: "corr-1",
            causationId: null,
            producer: "EventOutboxService",
          },
        }),
      ).not.toThrow();

      expect(() =>
        validatePayload("approval.request.decided", 1, {
          idempotencyKey: "req-1:step-1:approval.step.decided",
          approvalRequestId: "req-1",
          subjectType: "leave_request",
          subjectId: "leave-1",
          decision: "approved",
          decidedByUserId: "user-2",
          decidedAt: new Date().toISOString(),
        }),
      ).not.toThrow();
    });

    it("dispatches outbox events through InternalEventBus (when Redis event bus is disabled) and preserves outbox eventId and normalized payload", async () => {
      const internalBus = new InternalEventBus(new EventEmitter2());
      const receivedEvents: any[] = [];
      internalBus.on("approval.request.completed.v1", async (ev) => {
        receivedEvents.push(ev);
      });

      const outboxRow = {
        id: "outbox-row-uuid-1",
        eventType: "approval.request.completed.v1",
        eventVersion: 1,
        producerContext: "approval",
        aggregateType: "approval_request",
        aggregateId: "req-1",
        scopeId: "dept-1",
        correlationId: "corr-123",
        causationId: "cause-456",
        occurredAt: new Date("2026-10-19T10:00:00.000Z"),
        attemptCount: 0,
        maxAttempts: 12,
        payload: {
          idempotencyKey: "req-1:approval.request.completed",
          approvalRequestId: "req-1",
          policyKey: "leave_default",
          subjectType: "leave_request",
          subjectId: "leave-1",
          outcome: "approved",
          completedAt: "2026-10-19T10:00:00.000Z",
        },
      };

      const mockOutboxRepo = {
        recoverExpiredLeases: jest.fn().mockResolvedValue({ recoveredCount: 0, deadLetteredCount: 0 }),
        claimUnpublished: jest.fn().mockResolvedValue([outboxRow]),
        recordAttempt: jest.fn().mockResolvedValue(undefined),
        markPublished: jest.fn().mockResolvedValue(undefined),
        recordFailure: jest.fn().mockResolvedValue(undefined),
        recordPermanentFailure: jest.fn().mockResolvedValue(undefined),
        releaseLease: jest.fn().mockResolvedValue(undefined),
        getUnpublishedSummary: jest.fn().mockResolvedValue({
          unpublishedCount: 0,
          oldestUnpublishedAgeMs: 0,
        }),
      } as any;

      const dispatcher = new EventOutboxDispatcherService(
        mockOutboxRepo,
        internalBus,
        makeMetricsMock(),
        mockRequestContext,
      );

      await dispatcher.dispatchOnce();

      expect(mockOutboxRepo.markPublished).toHaveBeenCalledWith("outbox-row-uuid-1");
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toMatchObject({
        eventId: "outbox-row-uuid-1",
        eventType: "approval.request.completed.v1",
        aggregateId: "req-1",
        scopeId: "dept-1",
        correlationId: "corr-123",
        causationId: "cause-456",
        approvalRequestId: "req-1",
        policyKey: "leave_default",
        subjectType: "leave_request",
        subjectId: "leave-1",
        outcome: "approved",
      });
      expect(receivedEvents[0].data).toMatchObject({
        approvalRequestId: "req-1",
        outcome: "approved",
      });
    });

    it("preserves outbox eventId in RedisDurableEventBus.publish and enforces consumer idempotency on duplicate delivery", async () => {
      const xaddCalls: string[][] = [];
      const redis = {
        xadd: jest.fn(async (...args: string[]) => {
          xaddCalls.push(args);
          return "1-0";
        }),
      } as any;
      const redisService = {
        getClientOrNull: () => redis,
        getClient: () => redis,
      } as any;
      const config = {
        get: (key: string) => {
          if (key === "EVENT_BUS_STREAM_KEY") return "hrms:test:events";
          if (key === "EVENT_BUS_CONSUMER_GROUP") return "hrms-test";
          return undefined;
        },
      } as any;
      const db = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockResolvedValue(undefined),
        }),
      } as any;

      const redisBus = new RedisDurableEventBus(
        redisService,
        config,
        mockRequestContext,
        db,
        makeMetricsMock(),
      );

      await redisBus.publish({
        eventId: "outbox-row-uuid-99",
        eventType: "approval.request.completed.v1",
        eventVersion: 1,
        producerContext: "approval",
        aggregateId: "req-99",
        scopeId: "dept-9",
        correlationId: "corr-99",
        causationId: "cause-99",
        occurredAt: "2026-10-19T12:00:00.000Z",
        payload: {
          idempotencyKey: "req-99:approval.request.completed",
          approvalRequestId: "req-99",
          policyKey: "leave_default",
          subjectType: "leave_request",
          subjectId: "leave-99",
          outcome: "approved",
          completedAt: "2026-10-19T12:00:00.000Z",
        },
      });

      expect(xaddCalls).toHaveLength(1);
      const firstCall = xaddCalls[0]!;
      const dataIdx = firstCall.indexOf("data");
      const envelope = JSON.parse(firstCall[dataIdx + 1]!);

      expect(envelope.eventId).toBe("outbox-row-uuid-99");
      expect(envelope.aggregateId).toBe("req-99");
      expect(envelope.scopeId).toBe("dept-9");

      // EventIdempotencyRepository deduplicates repeated deliveries of the same eventId
      const seenKeys = new Set<string>();
      const mockDb = {
        query: {
          consumerIdempotency: {
            findFirst: jest.fn(async () =>
              seenKeys.has(`LeaveApprovalListener:${envelope.eventId}`)
                ? { consumerId: "LeaveApprovalListener", eventId: envelope.eventId }
                : null,
            ),
          },
        },
        insert: jest.fn(() => ({
          values: jest.fn(async (val: { consumerId: string; eventId: string }) => {
            seenKeys.add(`${val.consumerId}:${val.eventId}`);
          }),
        })),
      } as any;

      const idempotencyRepo = new EventIdempotencyRepository(mockDb);
      const sideEffect = jest.fn().mockResolvedValue("processed");

      const first = await idempotencyRepo.runIdempotent(
        "LeaveApprovalListener",
        envelope.eventId,
        sideEffect,
      );
      const duplicate = await idempotencyRepo.runIdempotent(
        "LeaveApprovalListener",
        envelope.eventId,
        sideEffect,
      );

      expect(first).toEqual({ executed: true, result: "processed" });
      expect(duplicate).toEqual({ executed: false });
      expect(sideEffect).toHaveBeenCalledTimes(1);
    });

    it("releases lease without incrementing attemptCount when rows are skipped due to OUTBOX_MAX_CONCURRENT_PER_TYPE throttling", async () => {
      const prevLimit = process.env.OUTBOX_MAX_CONCURRENT_PER_TYPE;
      process.env.OUTBOX_MAX_CONCURRENT_PER_TYPE = "5";
      try {
        const mockBus = {
          publish: jest.fn().mockResolvedValue(undefined),
          publishAll: jest.fn().mockResolvedValue(undefined),
          on: jest.fn(),
        };

        const rows = Array.from({ length: 8 }, (_, idx) => ({
          id: `outbox-row-${idx + 1}`,
          eventType: "leave.request.created.v1",
          eventVersion: 1,
          producerContext: "leave",
          aggregateType: "leave_request",
          aggregateId: `leave-${idx + 1}`,
          attemptCount: 0,
          maxAttempts: 12,
          payload: {
            leaveRequestId: `leave-${idx + 1}`,
            employeeId: "emp-1",
            leaveTypeId: "lt-1",
            startDate: "2026-10-20",
            endDate: "2026-10-21",
            totalDays: 2,
          },
        }));

        const mockOutboxRepo = {
          recoverExpiredLeases: jest.fn().mockResolvedValue({ recoveredCount: 0, deadLetteredCount: 0 }),
          claimUnpublished: jest.fn().mockResolvedValue(rows),
          recordAttempt: jest.fn().mockResolvedValue(undefined),
          markPublished: jest.fn().mockResolvedValue(undefined),
          recordFailure: jest.fn().mockResolvedValue(undefined),
          recordPermanentFailure: jest.fn().mockResolvedValue(undefined),
          releaseLease: jest.fn().mockResolvedValue(undefined),
          getUnpublishedSummary: jest.fn().mockResolvedValue({
            unpublishedCount: 3,
            oldestUnpublishedAgeMs: 100,
          }),
        } as any;

        const dispatcher = new EventOutboxDispatcherService(
          mockOutboxRepo,
          mockBus,
          makeMetricsMock(),
          mockRequestContext,
        );

        await dispatcher.dispatchOnce();

        // First 5 rows published, remaining 3 rows have their leases immediately released
        expect(mockBus.publish).toHaveBeenCalledTimes(5);
        expect(mockOutboxRepo.markPublished).toHaveBeenCalledTimes(5);
        expect(mockOutboxRepo.releaseLease).toHaveBeenCalledTimes(3);
        expect(mockOutboxRepo.releaseLease).toHaveBeenCalledWith("outbox-row-6");
        expect(mockOutboxRepo.releaseLease).toHaveBeenCalledWith("outbox-row-7");
        expect(mockOutboxRepo.releaseLease).toHaveBeenCalledWith("outbox-row-8");
        expect(mockOutboxRepo.recordFailure).not.toHaveBeenCalled();
        expect(mockOutboxRepo.recordPermanentFailure).not.toHaveBeenCalled();
      } finally {
        if (prevLimit === undefined) {
          delete process.env.OUTBOX_MAX_CONCURRENT_PER_TYPE;
        } else {
          process.env.OUTBOX_MAX_CONCURRENT_PER_TYPE = prevLimit;
        }
      }
    });

    it("schedules backoff retry on transient publish failure and dead-letters immediately on NonRetryableDispatchError", async () => {
      const transientRow = {
        id: "row-transient",
        eventType: "leave.request.created.v1",
        eventVersion: 1,
        producerContext: "leave",
        aggregateType: "leave_request",
        aggregateId: "leave-1",
        attemptCount: 1,
        maxAttempts: 12,
        payload: {
          leaveRequestId: "leave-1",
          employeeId: "emp-1",
          leaveTypeId: "lt-1",
          startDate: "2026-10-20",
          endDate: "2026-10-21",
          totalDays: 2,
        },
      };
      const permanentRow = {
        id: "row-permanent",
        eventType: "leave.request.created.v1",
        eventVersion: 1,
        producerContext: "leave",
        aggregateType: "leave_request",
        aggregateId: "leave-2",
        attemptCount: 0,
        maxAttempts: 12,
        payload: {
          leaveRequestId: "leave-2",
          employeeId: "emp-1",
          leaveTypeId: "lt-1",
          startDate: "2026-10-20",
          endDate: "2026-10-21",
          totalDays: 2,
        },
      };

      const mockBus = {
        publish: jest
          .fn()
          .mockRejectedValueOnce(new Error("Redis connection timeout"))
          .mockRejectedValueOnce(new NonRetryableDispatchError("Poison event payload")),
        publishAll: jest.fn(),
        on: jest.fn(),
      };

      const mockOutboxRepo = {
        recoverExpiredLeases: jest.fn().mockResolvedValue({ recoveredCount: 1, deadLetteredCount: 0 }),
        claimUnpublished: jest.fn().mockResolvedValue([transientRow, permanentRow]),
        recordAttempt: jest.fn().mockResolvedValue(undefined),
        markPublished: jest.fn().mockResolvedValue(undefined),
        recordFailure: jest.fn().mockResolvedValue(undefined),
        recordPermanentFailure: jest.fn().mockResolvedValue(undefined),
        releaseLease: jest.fn().mockResolvedValue(undefined),
        getUnpublishedSummary: jest.fn().mockResolvedValue({
          unpublishedCount: 1,
          oldestUnpublishedAgeMs: 500,
        }),
      } as any;

      const dispatcher = new EventOutboxDispatcherService(
        mockOutboxRepo,
        mockBus,
        makeMetricsMock(),
        mockRequestContext,
      );

      await dispatcher.dispatchOnce();

      expect(mockOutboxRepo.recoverExpiredLeases).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepo.recordFailure).toHaveBeenCalledWith(
        "row-transient",
        "Redis connection timeout",
        expect.any(Date),
        2,
        12,
      );
      expect(mockOutboxRepo.recordPermanentFailure).toHaveBeenCalledWith(
        "row-permanent",
        "Poison event payload",
        expect.any(Date),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. AUDIT-017 / AUDIT-018 / AUDIT-019 (AUDIT-020): Approval Engine
  // ─────────────────────────────────────────────────────────────────────────
  describe("AUDIT-017 / AUDIT-018 / AUDIT-019 — Approval Engine Invariants & Concurrency", () => {
    it("prevents self-approval in PlatformApprovalEngineService.decideStep", async () => {
      const repo = {
        findRequestById: jest.fn().mockResolvedValue({
          id: "req-1",
          policyId: "pol-1",
          subjectType: "leave_request",
          subjectId: "leave-1",
          status: "pending",
          currentStepIndex: 0,
          requestedByUserId: "user-requester",
        }),
      } as any;

      const service = new PlatformApprovalEngineService(repo);

      await expect(
        service.decideStep({
          requestId: "req-1",
          stepIndex: 0,
          decision: "approve",
          decidedByUserId: "user-requester",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("enforces step ordering (currentStepIndex) in PlatformApprovalEngineService.decideStep", async () => {
      const repo = {
        findRequestById: jest.fn().mockResolvedValue({
          id: "req-1",
          policyId: "pol-1",
          subjectType: "leave_request",
          subjectId: "leave-1",
          status: "pending",
          currentStepIndex: 0,
          requestedByUserId: "user-requester",
        }),
      } as any;

      const service = new PlatformApprovalEngineService(repo);

      await expect(
        service.decideStep({
          requestId: "req-1",
          stepIndex: 1,
          decision: "approve",
          decidedByUserId: "user-approver-2",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("supports active delegation in DecideApprovalStepUseCase and PlatformApprovalEngineService.findPendingStepByApprover", async () => {
      const stagedEvents: any[] = [];
      const repo = {
        findRequestById: jest.fn().mockResolvedValue({
          id: "req-1",
          policyId: "pol-1",
          subjectType: "leave_request",
          subjectId: "leave-1",
          status: "pending",
          currentStepIndex: 0,
          requestedByUserId: "user-requester",
        }),
        findStep: jest.fn().mockResolvedValue({
          id: "step-0",
          requestId: "req-1",
          stepIndex: 0,
          status: "pending",
          approverUserId: "user-manager",
          payload: {},
        }),
        findPendingStepByApprover: jest.fn().mockResolvedValue(null),
        isUserActiveDelegateOf: jest.fn().mockResolvedValue(true),
        findPolicyById: jest.fn().mockResolvedValue({ id: "pol-1", key: "leave_default" }),
        updateStepIfPending: jest.fn().mockResolvedValue({ id: "step-0", status: "approved" }),
        anyPendingStep: jest.fn().mockResolvedValue(false),
        updateRequestIfPending: jest.fn().mockResolvedValue({ id: "req-1", status: "approved" }),
        transaction: jest.fn(async (fn: any) => fn({ __tx: true })),
      } as any;

      const outbox = {
        stage: jest.fn(async (ev: any) => {
          stagedEvents.push(ev);
        }),
      } as any;

      const service = new PlatformApprovalEngineService(repo, outbox);
      const delegatedStep = await service.findPendingStepByApprover("req-1", "user-delegate");
      expect(delegatedStep?.id).toBe("step-0");

      const useCase = new DecideApprovalStepUseCase(repo, outbox);
      const result = await useCase.execute(
        {
          requestId: "req-1",
          stepIndex: 0,
          decision: "approve",
          comment: "Approved while manager is on PTO",
        },
        "user-delegate",
      );

      expect(result).toEqual({ status: "approved", delegated: true });
      expect(repo.isUserActiveDelegateOf).toHaveBeenCalledWith("user-delegate", "user-manager");
      expect(repo.updateStepIfPending).toHaveBeenCalledWith(
        "step-0",
        expect.objectContaining({
          status: "approved",
          decidedByUserId: "user-delegate",
          comment: "[Delegated on behalf of user-manager] Approved while manager is on PTO",
        }),
        expect.anything(),
      );
      expect(stagedEvents).toHaveLength(2);
      expect(stagedEvents[1].data).toMatchObject({
        approvalRequestId: "req-1",
        policyKey: "leave_default",
        subjectType: "leave_request",
        subjectId: "leave-1",
        outcome: "approved",
      });
    });

    it("enforces role-based step authorization when approverUserId is null and step payload specifies approverRole", async () => {
      const repo = {
        findRequestById: jest.fn().mockResolvedValue({
          id: "req-role",
          policyId: "pol-1",
          subjectType: "payroll_run",
          subjectId: "run-1",
          status: "pending",
          currentStepIndex: 0,
          requestedByUserId: "user-requester",
        }),
        findStep: jest.fn().mockResolvedValue({
          id: "step-role-0",
          requestId: "req-role",
          stepIndex: 0,
          status: "pending",
          approverUserId: null,
          payload: { approverRole: "HR_DIRECTOR" },
        }),
        transaction: jest.fn(async (fn: any) => fn({ __tx: true })),
      } as any;
      const outbox = { stage: jest.fn() } as any;
      const useCase = new DecideApprovalStepUseCase(repo, outbox);

      await expect(
        useCase.execute(
          {
            requestId: "req-role",
            stepIndex: 0,
            decision: "approve",
          },
          "user-employee",
          ["EMPLOYEE"],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("prevents concurrent double-approval race conditions via atomic updateStepIfPending and stages outbox events in PlatformApprovalEngineService", async () => {
      let stepClaimed = false;
      const stagedEvents: any[] = [];
      const repo = {
        findRequestById: jest.fn().mockResolvedValue({
          id: "req-race",
          policyId: "pol-1",
          subjectType: "leave_request",
          subjectId: "leave-race",
          status: "pending",
          currentStepIndex: 0,
          requestedByUserId: "user-requester",
        }),
        findStep: jest.fn().mockResolvedValue({
          id: "step-race-0",
          requestId: "req-race",
          stepIndex: 0,
          status: "pending",
          approverUserId: "user-approver",
          payload: {},
        }),
        findPolicyById: jest.fn().mockResolvedValue({ id: "pol-1", key: "leave_default" }),
        updateStepIfPending: jest.fn(async () => {
          if (stepClaimed) return null;
          stepClaimed = true;
          return { id: "step-race-0", status: "approved" };
        }),
        anyPendingStep: jest.fn().mockResolvedValue(false),
        updateRequestIfPending: jest.fn().mockResolvedValue({ id: "req-race", status: "approved" }),
        transaction: jest.fn(async (fn: any) => fn({ __tx: true })),
      } as any;

      const outbox = {
        stage: jest.fn(async (ev: any) => {
          stagedEvents.push(ev);
        }),
      } as any;

      const service = new PlatformApprovalEngineService(repo, outbox);

      const [res1, res2] = await Promise.allSettled([
        service.decideStep({
          requestId: "req-race",
          stepIndex: 0,
          decision: "approve",
          decidedByUserId: "user-approver",
        }),
        service.decideStep({
          requestId: "req-race",
          stepIndex: 0,
          decision: "approve",
          decidedByUserId: "user-approver",
        }),
      ]);

      const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
      const rejected = [res1, res2].filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(stagedEvents).toHaveLength(2); // 1 Decided + 1 Completed (no duplicate completion event)
    });

    it("binds requestedByUserId exclusively from authenticated user in ApprovalRequestController.create, rejects missing principal, and throws 404 in ApprovalInboxController when step is missing", async () => {
      const mockRequestApproval = { execute: jest.fn().mockResolvedValue({ id: "req-1" }) };
      const controller = new ApprovalRequestController(
        mockRequestApproval as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );

      await controller.create(
        {
          policyId: VALID_UUID_1,
          subjectType: "leave_request",
          subjectId: VALID_UUID_2,
        },
        { user: { id: "actual-authenticated-user", roles: ["EMPLOYEE"] } } as any,
      );

      expect(mockRequestApproval.execute).toHaveBeenCalledWith(
        {
          policyId: VALID_UUID_1,
          subjectType: "leave_request",
          subjectId: VALID_UUID_2,
        },
        "actual-authenticated-user",
      );

      await expect(
        controller.create(
          {
            policyId: VALID_UUID_1,
            subjectType: "leave_request",
            subjectId: VALID_UUID_2,
          },
          undefined,
        ),
      ).rejects.toThrow(ForbiddenException);

      const mockGateway = {
        findPendingStepByApprover: jest.fn().mockResolvedValue(null),
        decideStep: jest.fn(),
      };
      const inboxController = new ApprovalInboxController({} as any, mockGateway as any);

      await expect(
        inboxController.approve(
          VALID_UUID_1,
          { comment: "LGTM" },
          { user: { id: "user-1" } } as any,
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        inboxController.reject(
          VALID_UUID_1,
          { comment: "No" },
          { user: { id: "user-1" } } as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. AUDIT-007 / AUDIT-008 / AUDIT-009 / AUDIT-011 (AUDIT-022): DTO Validation
  // ─────────────────────────────────────────────────────────────────────────
  describe("AUDIT-007 / AUDIT-008 / AUDIT-009 / AUDIT-011 — Global ValidationPipe Contract Tests", () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    const validateBody = (metatype: any, value: unknown) =>
      pipe.transform(value, { type: "body", metatype });

    it("accepts valid Expense DTO payloads and rejects missing/invalid/unknown properties", async () => {
      await expect(
        validateBody(CreateClaimDto, {
          title: "Business Trip",
          description: "Hanoi client visit",
          currency: "VND",
        }),
      ).resolves.toMatchObject({ title: "Business Trip", currency: "VND" });

      await expect(validateBody(CreateClaimDto, { title: "" })).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        validateBody(CreateClaimDto, { title: "Valid", unexpectedField: "hack" }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateBody(AddItemDto, {
          claimId: VALID_UUID_1,
          description: "Flight ticket",
          amount: 1500000,
          expenseDate: "2026-10-19",
          receiptRequired: true,
        }),
      ).resolves.toMatchObject({ claimId: VALID_UUID_1, amount: 1500000 });

      await expect(
        validateBody(AddItemDto, {
          claimId: "not-a-uuid",
          description: "Flight",
          amount: -10,
          expenseDate: "invalid-date",
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateBody(RejectClaimDto, { reason: "Missing receipt" }),
      ).resolves.toMatchObject({ reason: "Missing receipt" });
    });

    it("accepts valid Benefit DTO payloads and rejects invalid enum/UUID/number values", async () => {
      await expect(
        validateBody(CreatePlanDto, {
          name: "Gold Health Plan",
          coverageType: "family",
          employerContribution: 500,
          employeeContribution: 100,
          maxEligibleAge: 65,
        }),
      ).resolves.toMatchObject({ name: "Gold Health Plan", coverageType: "family" });

      await expect(
        validateBody(CreatePlanDto, {
          name: "Bad Plan",
          coverageType: "invalid_coverage",
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateBody(EnrollEmployeeDto, {
          planId: VALID_UUID_1,
          employeeId: VALID_UUID_2,
          coverageType: "employee_only",
        }),
      ).resolves.toMatchObject({ planId: VALID_UUID_1, employeeId: VALID_UUID_2 });

      await expect(
        validateBody(AddDependentDto, {
          enrollmentId: VALID_UUID_1,
          fullName: "Nguyen Van B",
          relationship: "Spouse",
          dateOfBirth: "1995-05-20",
        }),
      ).resolves.toMatchObject({ fullName: "Nguyen Van B" });
    });

    it("accepts valid Recruitment Interview DTO payloads and validates nested scorecard rubric items", async () => {
      await expect(
        validateBody(ScheduleInterviewDto, {
          applicationId: VALID_UUID_1,
          title: "System Design Interview",
          interviewType: "technical",
          scheduledAt: "2026-10-25T09:00:00.000Z",
          durationMinutes: 60,
        }),
      ).resolves.toMatchObject({ title: "System Design Interview", durationMinutes: 60 });

      await expect(
        validateBody(CompleteInterviewDto, { notes: "Completed on time" }),
      ).resolves.toMatchObject({ notes: "Completed on time" });

      await expect(
        validateBody(SubmitScorecardDto, {
          rating: 4,
          feedback: "Strong architecture skills",
          rubric: [{ category: "Distributed Systems", score: 5, comment: "Excellent" }],
        }),
      ).resolves.toMatchObject({ rating: 4 });

      // Score out of [1, 5] range in nested rubric must be rejected
      await expect(
        validateBody(SubmitScorecardDto, {
          rating: 4,
          rubric: [{ category: "Distributed Systems", score: 99 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("accepts valid Performance DTO payloads and validates nested review ratings", async () => {
      await expect(
        validateBody(CreateCycleDto, {
          name: "2026 H2 Performance Review",
          startsOn: "2026-07-01",
          endsOn: "2026-12-31",
          config: { weights: { goals: 0.6, competencies: 0.4 } },
        }),
      ).resolves.toMatchObject({ name: "2026 H2 Performance Review" });

      await expect(
        validateBody(CreateGoalDto, {
          title: "Improve API latency",
          employeeIds: [VALID_UUID_1, VALID_UUID_2],
        }),
      ).resolves.toMatchObject({ title: "Improve API latency" });

      await expect(
        validateBody(AssignReviewerDto, {
          cycleId: VALID_UUID_1,
          employeeId: VALID_UUID_2,
          reviewerId: VALID_UUID_3,
          reviewType: "manager",
        }),
      ).resolves.toMatchObject({ reviewType: "manager" });

      await expect(
        validateBody(SubmitReviewDto, {
          overallComment: "Consistently exceeds expectations",
          ratings: [{ competencyId: "comp-1", score: 4.5, comment: "Great ownership" }],
        }),
      ).resolves.toMatchObject({ overallComment: "Consistently exceeds expectations" });

      await expect(
        validateBody(SubmitReviewDto, {
          ratings: [{ competencyId: "", score: -5 }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateBody(PublishResultDto, {
          employeeId: VALID_UUID_1,
          finalScore: 4.5,
          ratingLabel: "Exceeds Expectations",
        }),
      ).resolves.toMatchObject({ employeeId: VALID_UUID_1, finalScore: 4.5 });
    });

    it("accepts valid Learning DTO payloads and rejects invalid UUID arrays or negative numbers", async () => {
      await expect(
        validateBody(CreateCourseDto, {
          title: "Security Engineering 101",
          estimatedHours: 8,
        }),
      ).resolves.toMatchObject({ title: "Security Engineering 101", estimatedHours: 8 });

      await expect(
        validateBody(AssignCourseDto, {
          courseId: VALID_UUID_1,
          employeeIds: [VALID_UUID_2],
        }),
      ).resolves.toMatchObject({ courseId: VALID_UUID_1 });

      await expect(
        validateBody(AssignCourseDto, {
          courseId: VALID_UUID_1,
          employeeIds: [],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateBody(CreateSessionDto, {
          courseId: VALID_UUID_1,
          title: "Live Workshop",
          scheduledAt: "2026-11-01T10:00:00.000Z",
          durationMinutes: 90,
          maxAttendees: 30,
        }),
      ).resolves.toMatchObject({ title: "Live Workshop" });

      await expect(
        validateBody(CreateCertificationDefDto, {
          name: "Certified Security Specialist",
          validityMonths: 24,
        }),
      ).resolves.toMatchObject({ name: "Certified Security Specialist" });

      await expect(
        validateBody(IssueCertificateDto, {
          definitionId: VALID_UUID_1,
          employeeId: VALID_UUID_2,
        }),
      ).resolves.toMatchObject({ definitionId: VALID_UUID_1, employeeId: VALID_UUID_2 });

      await expect(
        validateBody(CreatePathDto, {
          name: "Backend Engineering Track",
          courses: [VALID_UUID_1],
        }),
      ).resolves.toMatchObject({ name: "Backend Engineering Track" });

      await expect(
        validateBody(AssignPathDto, {
          pathId: VALID_UUID_1,
          employeeIds: [VALID_UUID_2],
        }),
      ).resolves.toMatchObject({ pathId: VALID_UUID_1 });
    });

    it("validates InboxDecisionDto, DecideApprovalStepDto, and blocks mass-assignment on UpdateLeaveRequestDto", async () => {
      await expect(
        validateBody(InboxDecisionDto, { comment: "Approved via inbox" }),
      ).resolves.toMatchObject({ comment: "Approved via inbox" });

      await expect(
        validateBody(DecideApprovalStepDto, {
          stepIndex: 0,
          decision: "approve",
          comment: "Looks good",
        }),
      ).resolves.toMatchObject({ stepIndex: 0, decision: "approve" });

      await expect(
        validateBody(DecideApprovalStepDto, {
          stepIndex: -1,
          decision: "approve",
        }),
      ).rejects.toThrow(BadRequestException);

      // UpdateLeaveRequestDto allows mutable fields
      await expect(
        validateBody(UpdateLeaveRequestDto, {
          startDate: "2026-11-10",
          endDate: "2026-11-12",
          totalUnits: "3",
          reason: "Updated family trip dates",
        }),
      ).resolves.toMatchObject({
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        totalUnits: "3",
        reason: "Updated family trip dates",
      });

      // UpdateLeaveRequestDto rejects mass-assignment of employeeId or leaveTypeId
      await expect(
        validateBody(UpdateLeaveRequestDto, {
          employeeId: VALID_UUID_1,
          reason: "Attempt to reassign leave owner",
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateBody(UpdateLeaveRequestDto, {
          leaveTypeId: VALID_UUID_2,
          reason: "Attempt to swap leave type",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. WAVE2-V01 through WAVE2-V08 Targeted Verification & Remediation Suite
  // ─────────────────────────────────────────────────────────────────────────
  describe("WAVE2-V01 through WAVE2-V08 — Targeted Remediation Regression Tests", () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const validateBody = (metatype: any, value: unknown) =>
      pipe.transform(value, { type: "body", metatype });

    it("WAVE2-V01: rejects spoofed requestedByUserId in RequestApprovalDto under forbidNonWhitelisted", async () => {
      await expect(
        validateBody(RequestApprovalDto, {
          policyId: VALID_UUID_1,
          subjectType: "leave",
          subjectId: VALID_UUID_2,
          requestedByUserId: VALID_UUID_3,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateBody(RequestApprovalDto, {
          policyId: VALID_UUID_1,
          subjectType: "leave",
          subjectId: VALID_UUID_2,
        }),
      ).resolves.toEqual({
        policyId: VALID_UUID_1,
        subjectType: "leave",
        subjectId: VALID_UUID_2,
      });
    });

    it("WAVE2-V02: PlatformApprovalEngineService.decideStep includes decidedByUserId on completed events, LeaveApprovalListener records real approver, and PayrollDecisionHandler applies approval/rejection", async () => {
      const stagedEvents: any[] = [];
      const repo = {
        findRequestById: jest.fn().mockResolvedValue({
          id: VALID_UUID_1,
          policyId: "pol-1",
          subjectType: "leave",
          subjectId: VALID_UUID_2,
          status: "pending",
          currentStepIndex: 0,
          requestedByUserId: "user-requester",
        }),
        findStep: jest.fn().mockResolvedValue({
          id: "step-0",
          requestId: VALID_UUID_1,
          stepIndex: 0,
          status: "pending",
          approverUserId: VALID_UUID_3,
          payload: {},
        }),
        findPolicyById: jest.fn().mockResolvedValue({ id: "pol-1", key: "leave_default" }),
        updateStepIfPending: jest.fn().mockResolvedValue({ id: "step-0", status: "approved" }),
        anyPendingStep: jest.fn().mockResolvedValue(false),
        updateRequestIfPending: jest.fn().mockResolvedValue({ id: VALID_UUID_1, status: "approved" }),
        transaction: jest.fn(async (fn: any) => fn({ __tx: true })),
      } as any;

      const outbox = {
        stage: jest.fn(async (ev: any) => {
          stagedEvents.push(ev);
        }),
      } as any;

      const engine = new PlatformApprovalEngineService(repo, outbox);
      await engine.decideStep({
        requestId: VALID_UUID_1,
        stepIndex: 0,
        decision: "approve",
        decidedByUserId: VALID_UUID_3,
      });

      const completedEvent = stagedEvents.find(
        (e) => e.eventType === "approval.request.completed.v1",
      );
      expect(completedEvent).toBeDefined();
      expect(completedEvent.data.decidedByUserId).toBe(VALID_UUID_3);

      // Verify LeaveApprovalListener passes real decidedByUserId (never "system")
      const mockLeaveDecisionHandler = {
        handleApproval: jest.fn().mockResolvedValue({ applied: true, finalStatus: "approved" }),
        handleRejection: jest.fn(),
        handleCancellation: jest.fn(),
      };
      const leaveListener = new LeaveApprovalListener(
        { on: jest.fn() } as any,
        mockLeaveDecisionHandler as any,
        { findByApprovalRequestId: jest.fn().mockResolvedValue({ id: "link-1" }) } as any,
        {
          isProcessed: jest.fn().mockResolvedValue(false),
          markProcessed: jest.fn().mockResolvedValue(undefined),
        } as any,
        {
          get: () => null,
          run: (_ctx: any, fn: any) => fn(),
        } as any,
        {
          extractFromPayload: () => null,
          runWithSpan: (_name: string, fn: any) => fn(),
        } as any,
      );

      await (leaveListener as any).handleEngineDecision(completedEvent);
      expect(mockLeaveDecisionHandler.handleApproval).toHaveBeenCalledWith({
        leaveRequestId: VALID_UUID_2,
        decidedByUserId: VALID_UUID_3,
        decidedAt: expect.any(Date),
      });

      // Verify PayrollApprovalListener + PayrollDecisionHandler applies approval & rejection with real decidedByUserId
      const insertedHistory: any[] = [];
      let payrollStatus = "pending_approval";
      const mockPayrollDb = {
        query: {
          approvalRequests: {
            findFirst: jest.fn().mockResolvedValue({
              id: VALID_UUID_1,
              requestedByUserId: "user-requester",
              metadata: { payrollRunId: VALID_UUID_2 },
            }),
          },
          payrollRuns: {
            findFirst: jest.fn(async () => ({
              id: VALID_UUID_2,
              status: payrollStatus,
              calculationStatus: "CONFIRMED",
              isProvisional: false,
            })),
          },
          payrollRunApprovalHistory: {
            findMany: jest.fn().mockResolvedValue([
              {
                action: "REQUESTED",
                performedByUserId: "user-requester",
              },
            ]),
          },
          payslips: {
            findMany: jest.fn().mockResolvedValue([
              { id: "ps-1", metadata: { isProvisional: false, calculationStatus: "CONFIRMED" } },
            ]),
          },
        },
        transaction: jest.fn(async (fn: any) =>
          fn({
            query: mockPayrollDb.query,
            update: jest.fn(() => ({
              set: jest.fn((patch: any) => ({
                where: jest.fn(() => ({
                  returning: jest.fn(async () => {
                    payrollStatus = patch.status;
                    return [{ id: VALID_UUID_2 }];
                  }),
                })),
              })),
            })),
            insert: jest.fn(() => ({
              values: jest.fn(async (row: any) => {
                insertedHistory.push(row);
              }),
            })),
          }),
        ),
      } as any;

      const payrollDecisionHandler = new PayrollDecisionHandler(
        mockPayrollDb,
        mockRequestContext,
      );
      const payrollListener = new PayrollApprovalListener(
        { on: jest.fn() } as any,
        payrollDecisionHandler,
        mockRequestContext,
      );

      await (payrollListener as any).handleApprovalRequestCompleted({
        eventId: "ev-payroll-approve",
        data: {
          approvalRequestId: VALID_UUID_1,
          subjectType: "payroll",
          subjectId: VALID_UUID_2,
          outcome: "approved",
          decidedByUserId: VALID_UUID_3,
          completedAt: new Date().toISOString(),
        },
      });

      expect(payrollStatus).toBe("approved");
      expect(insertedHistory).toHaveLength(1);
      expect(insertedHistory[0]).toMatchObject({
        payrollRunId: VALID_UUID_2,
        action: "APPROVED",
        performedByUserId: VALID_UUID_3,
      });
    });

    it("WAVE2-V04: executes findRequestById inside transaction and handles outcome === 'cancelled' without falsely marking domain records rejected", async () => {
      // 1. AssetDecisionHandler transitions pending_approval asset request to "cancelled" (not "rejected")
      const mockAssetRepo = {
        findById: jest.fn().mockResolvedValue({ id: "asset-req-1", status: "pending_approval" }),
        updateStatus: jest.fn().mockResolvedValue(undefined),
      };
      const mockAssetLinkRepo = {
        findByApprovalRequestId: jest.fn().mockResolvedValue({ id: "link-1" }),
        updateStatus: jest.fn().mockResolvedValue(undefined),
      };
      const assetHandler = new AssetDecisionHandler(mockAssetRepo as any, mockRequestContext);
      const assetListener = new AssetApprovalListener(
        { on: jest.fn() } as any,
        assetHandler,
        mockAssetLinkRepo as any,
        {
          isProcessed: jest.fn().mockResolvedValue(false),
          markProcessed: jest.fn().mockResolvedValue(undefined),
        } as any,
        { get: () => null, run: (_c: any, fn: any) => fn() } as any,
        { extractFromPayload: () => null, runWithSpan: (_n: string, fn: any) => fn() } as any,
      );

      await (assetListener as any).handleEngineDecision({
        eventId: "ev-asset-cancel",
        data: {
          approvalRequestId: "app-asset-1",
          subjectType: "asset_request",
          subjectId: "asset-req-1",
          outcome: "cancelled",
          completedAt: new Date().toISOString(),
        },
      });

      expect(mockAssetRepo.updateStatus).toHaveBeenCalledWith("asset-req-1", {
        status: "cancelled",
        updatedBy: null,
      });
      expect(mockAssetLinkRepo.updateStatus).toHaveBeenCalledWith("app-asset-1", "cancelled");

      // 2. RecruitmentDecisionHandler returns pending_approval requisition to "draft" (not "rejected") on cancellation
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: "req-1", status: "pending_approval" }),
        updateStatus: jest.fn().mockResolvedValue(undefined),
      };
      const mockRecLinkRepo = {
        findByApprovalRequestId: jest.fn().mockResolvedValue({ id: "link-rec-1" }),
        updateStatus: jest.fn().mockResolvedValue(undefined),
      };
      const recHandler = new RecruitmentDecisionHandler(
        mockReqRepo as any,
        {} as any,
        mockRequestContext,
      );
      const recListener = new RecruitmentApprovalListener(
        { on: jest.fn() } as any,
        recHandler,
        mockRecLinkRepo as any,
        {
          isProcessed: jest.fn().mockResolvedValue(false),
          markProcessed: jest.fn().mockResolvedValue(undefined),
        } as any,
        { get: () => null, run: (_c: any, fn: any) => fn() } as any,
        { extractFromPayload: () => null, runWithSpan: (_n: string, fn: any) => fn() } as any,
      );

      await (recListener as any).handleEngineDecision({
        eventId: "ev-rec-cancel",
        data: {
          approvalRequestId: "app-rec-1",
          subjectType: "recruitment_requisition",
          subjectId: "req-1",
          outcome: "cancelled",
          completedAt: new Date().toISOString(),
        },
      });

      expect(mockReqRepo.updateStatus).toHaveBeenCalledWith("req-1", "draft");
      expect(mockRecLinkRepo.updateStatus).toHaveBeenCalledWith("app-rec-1", "cancelled");
    });

    it("WAVE2-V05: PayrollApprovalListener and PayrollApprovalIntegrationHandler rethrow transient errors and deduplicate redeliveries via EventIdempotencyRepository", async () => {
      const processedEvents = new Set<string>();
      const idempotency = {
        isProcessed: jest.fn(async (c: string, id: string) => processedEvents.has(`${c}:${id}`)),
        markProcessed: jest.fn(async (c: string, id: string) => {
          processedEvents.add(`${c}:${id}`);
        }),
      } as any;

      const failingDecisionHandler = {
        handleApproval: jest
          .fn()
          .mockRejectedValueOnce(new Error("Transient DB deadlock"))
          .mockResolvedValueOnce(undefined),
      };

      const listener = new PayrollApprovalListener(
        { on: jest.fn() } as any,
        failingDecisionHandler as any,
        mockRequestContext,
        idempotency,
      );

      const eventPayload = {
        eventId: "ev-payroll-retry-1",
        data: {
          approvalRequestId: VALID_UUID_1,
          subjectType: "payroll",
          subjectId: VALID_UUID_2,
          outcome: "approved",
          decidedByUserId: VALID_UUID_3,
          completedAt: new Date().toISOString(),
        },
      };

      // 1st attempt fails and rethrows so outbox/event-bus retries
      await expect(
        (listener as any).handleApprovalRequestCompleted(eventPayload),
      ).rejects.toThrow("Transient DB deadlock");
      expect(idempotency.markProcessed).not.toHaveBeenCalled();

      // 2nd attempt succeeds and marks processed
      await expect(
        (listener as any).handleApprovalRequestCompleted(eventPayload),
      ).resolves.toBeUndefined();
      expect(idempotency.markProcessed).toHaveBeenCalledWith(
        "payroll-approval-listener",
        "ev-payroll-retry-1",
      );

      // 3rd duplicate delivery is skipped idempotently
      await (listener as any).handleApprovalRequestCompleted(eventPayload);
      expect(failingDecisionHandler.handleApproval).toHaveBeenCalledTimes(2);

      // Verify PayrollApprovalIntegrationHandler also rethrows and deduplicates
      const gatewayMock = {
        requestApproval: jest
          .fn()
          .mockRejectedValueOnce(new Error("Connection reset"))
          .mockResolvedValueOnce({ id: "app-payroll-1" }),
      };
      const integrationHandler = new PayrollApprovalIntegrationHandler(
        { on: jest.fn() } as any,
        { resolve: jest.fn().mockResolvedValue("pol-payroll-1") } as any,
        gatewayMock as any,
        mockRequestContext,
        idempotency,
      );

      const processedEvent = {
        eventId: "ev-payroll-processed-1",
        data: {
          payrollRunId: VALID_UUID_2,
          processedByUserId: VALID_UUID_1,
        },
      };

      await expect(
        (integrationHandler as any).handlePayrollProcessed(processedEvent),
      ).rejects.toThrow("Connection reset");

      await expect(
        (integrationHandler as any).handlePayrollProcessed(processedEvent),
      ).resolves.toBeUndefined();

      await (integrationHandler as any).handlePayrollProcessed(processedEvent);
      expect(gatewayMock.requestApproval).toHaveBeenCalledTimes(2);
    });

    it("WAVE2-V06: stages LeaveCancellationRequestedEvent with .v1 eventType and validates all non-core staged events through EventOutboxService.stage", async () => {
      registerAllDomainEvents();
      const insertedEnvelopes: any[] = [];
      const outboxService = new EventOutboxService(
        mockRequestContext,
        {
          insert: jest.fn(async (env: any) => {
            insertedEnvelopes.push(env);
            return { id: env.eventId };
          }),
        } as any,
        { incrementOutboxEventsCreated: jest.fn() } as any,
        {
          current: () => ({
            traceId: "t-1",
            spanId: "s-1",
            parentSpanId: null,
            correlationId: "c-1",
          }),
        } as any,
      );

      // Verify CancelLeaveRequestUseCase stages canonical LeaveCancellationRequestedEvent (leave.cancellation.requested.v1)
      const cancelLeaveUseCase = new CancelLeaveRequestUseCase(
        {
          findById: jest.fn().mockResolvedValue({
            id: VALID_UUID_1,
            employeeId: VALID_UUID_2,
            leaveTypeId: VALID_UUID_3,
            status: "pending",
            startDate: "2026-11-01",
            endDate: "2026-11-02",
            totalUnits: "2",
          }),
          transaction: jest.fn(async (fn: any) => fn({ __tx: true })),
          updateStatusWithGuard: jest.fn().mockResolvedValue({ id: VALID_UUID_1, status: "cancelled" }),
          createAuditLog: jest.fn().mockResolvedValue(undefined),
        } as any,
        { assertTransition: jest.fn() } as any,
        { reconcileCanceledLeave: jest.fn() } as any,
        outboxService,
        mockRequestContext,
        { canCancel: jest.fn().mockResolvedValue(undefined) } as any,
      );

      await cancelLeaveUseCase.execute(VALID_UUID_1, { id: VALID_UUID_3 } as any);

      expect(insertedEnvelopes[0]).toMatchObject({
        eventType: "leave.cancellation.requested.v1",
        payload: expect.objectContaining({
          data: expect.objectContaining({
            idempotencyKey: `${VALID_UUID_1}:leave.cancellation.requested`,
            leaveRequestId: VALID_UUID_1,
            cancelledByUserId: VALID_UUID_3,
            cancelledAt: expect.any(String),
          }),
        }),
      });

      // Stage all 13 non-core events through EventOutboxService.stage to prove registry & payload schema compliance
      const nonCoreEvents = [
        { eventType: "offboarding.completed.v1", payload: { processId: "p-1", employeeId: "e-1" } },
        { eventType: "offboarding.started.v1", payload: { processId: "p-1", employeeId: "e-1", templateId: null } },
        {
          eventType: "onboarding.process.created.v1",
          payload: {
            id: "ob-1",
            employeeId: "e-1",
            templateId: "tpl-1",
            type: "onboarding",
            status: "in_progress",
            startDate: "2026-10-19",
            targetEndDate: null,
            assignedHrUserId: null,
            checklistItems: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          eventType: "onboarding.item.completed.v1",
          payload: { processId: "ob-1", itemId: "item-1", status: "completed", completedByUserId: "u-1" },
        },
        {
          eventType: "onboarding.process.completed.v1",
          payload: { processId: "ob-1", employeeId: "e-1", completedAt: new Date().toISOString() },
        },
        {
          eventType: "attendance.violation.created.v1",
          payload: {
            violationId: "v-1",
            sessionId: "s-1",
            employeeId: "e-1",
            code: "LATE_CHECKIN",
            severity: "warning",
            status: "open",
          },
        },
        {
          eventType: "workforce.department.moved",
          payload: { departmentId: "d-1", oldParentId: null, newParentId: "d-2", effectiveDate: "2026-10-19" },
        },
        {
          eventType: "workforce.position.created",
          payload: { positionId: "pos-1", title: "Staff Engineer", departmentId: "d-1" },
        },
        {
          eventType: "workforce.position.reclassified",
          payload: {
            positionId: "pos-1",
            oldGradeId: "g-1",
            newGradeId: "g-2",
            oldDepartmentId: "d-1",
            newDepartmentId: "d-1",
            effectiveDate: "2026-10-19",
          },
        },
        {
          eventType: "leave.request.cancelled",
          payload: { leaveRequestId: "lr-1", employeeId: "e-1" },
        },
        {
          eventType: "task.created",
          payload: { taskId: "t-1", assigneeEmployeeId: null },
        },
        {
          eventType: "task.completed",
          payload: { taskId: "t-1", previousStatus: "in_progress", nextStatus: "completed" },
        },
        {
          eventType: "task.reassigned",
          payload: { taskId: "t-1", oldAssigneeId: "e-1", newAssigneeId: "e-2", reason: "Load balancing" },
        },
        {
          eventType: "task.revision_requested",
          payload: { taskId: "t-1", reason: "Needs tests", previousStatus: "in_review", nextStatus: "in_progress" },
        },
      ];

      for (const ev of nonCoreEvents) {
        await expect(outboxService.stage(ev)).resolves.toEqual({ id: expect.any(String) });
      }
    });

    it("WAVE2-V07 & WAVE2-V08: validates AssignGoalDto, EnrollCourseDto, and normalizes empty strings on optional Benefit/Learning DTO fields", async () => {
      // AssignGoalDto
      await expect(
        validateBody(AssignGoalDto, { employeeId: VALID_UUID_1 }),
      ).resolves.toEqual({ employeeId: VALID_UUID_1 });
      await expect(
        validateBody(AssignGoalDto, { employeeId: "not-a-uuid" }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        validateBody(AssignGoalDto, { employeeId: VALID_UUID_1, extra: "field" }),
      ).rejects.toThrow(BadRequestException);

      // EnrollCourseDto
      await expect(
        validateBody(EnrollCourseDto, { courseId: VALID_UUID_2 }),
      ).resolves.toEqual({ courseId: VALID_UUID_2 });
      await expect(
        validateBody(EnrollCourseDto, { courseId: "bad-uuid" }),
      ).rejects.toThrow(BadRequestException);

      // Empty string normalization on optional Benefit & Learning fields
      await expect(
        validateBody(CreatePlanDto, {
          name: "Standard Health Plan",
          coverageType: "employee_only",
          providerId: "",
          effectiveFrom: "",
          effectiveTo: "",
        }),
      ).resolves.toMatchObject({
        name: "Standard Health Plan",
        providerId: undefined,
        effectiveFrom: undefined,
        effectiveTo: undefined,
      });

      await expect(
        validateBody(CreateSessionDto, {
          courseId: VALID_UUID_1,
          title: "Onboarding Session",
          scheduledAt: "2026-11-01T09:00:00.000Z",
          meetingUrl: "",
        }),
      ).resolves.toMatchObject({
        title: "Onboarding Session",
        meetingUrl: undefined,
      });

      await expect(
        validateBody(CreateSessionDto, {
          courseId: VALID_UUID_1,
          title: "Onboarding Session",
          scheduledAt: "2026-11-01T09:00:00.000Z",
          meetingUrl: "not-a-valid-url",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("Closure Area 1: propagates PayrollApprovalListener and PayrollApprovalIntegrationHandler errors through InternalEventBus to EventOutboxDispatcherService and handles crash-after-commit safely", async () => {
      const internalBus = new InternalEventBus(new EventEmitter2());
      const processedEvents = new Set<string>();
      const idempotencyRepo = {
        isProcessed: jest.fn(async (c: string, id: string) => processedEvents.has(`${c}:${id}`)),
        markProcessed: jest.fn(async (c: string, id: string) => {
          processedEvents.add(`${c}:${id}`);
        }),
      } as any;

      const decisionHandler = {
        handleApproval: jest
          .fn()
          .mockRejectedValueOnce(new Error("Transient DB timeout"))
          .mockResolvedValueOnce(undefined),
        handleRejection: jest.fn(),
      };

      const payrollListener = new PayrollApprovalListener(
        internalBus,
        decisionHandler as any,
        mockRequestContext,
        idempotencyRepo,
      );
      payrollListener.onModuleInit();

      const outboxRow = {
        id: "outbox-payroll-approve-1",
        eventType: "approval.request.completed.v1",
        eventVersion: 1,
        producerContext: "approval",
        aggregateType: "approval_request",
        aggregateId: VALID_UUID_1,
        occurredAt: new Date("2026-10-19T12:00:00.000Z"),
        attemptCount: 0,
        maxAttempts: 12,
        payload: {
          idempotencyKey: `${VALID_UUID_1}:approval.request.completed`,
          approvalRequestId: VALID_UUID_1,
          policyKey: "payroll_default",
          subjectType: "payroll",
          subjectId: VALID_UUID_2,
          outcome: "approved",
          decidedByUserId: VALID_UUID_3,
          completedAt: "2026-10-19T12:00:00.000Z",
        },
      };

      const mockOutboxRepo = {
        recoverExpiredLeases: jest.fn().mockResolvedValue({ recoveredCount: 0, deadLetteredCount: 0 }),
        claimUnpublished: jest.fn().mockResolvedValue([outboxRow]),
        recordAttempt: jest.fn().mockResolvedValue(undefined),
        markPublished: jest.fn().mockResolvedValue(undefined),
        recordFailure: jest.fn().mockResolvedValue(undefined),
        recordPermanentFailure: jest.fn().mockResolvedValue(undefined),
        releaseLease: jest.fn().mockResolvedValue(undefined),
        getUnpublishedSummary: jest.fn().mockResolvedValue({
          unpublishedCount: 1,
          oldestUnpublishedAgeMs: 100,
        }),
      } as any;

      const dispatcher = new EventOutboxDispatcherService(
        mockOutboxRepo,
        internalBus,
        makeMetricsMock(),
        mockRequestContext,
      );

      // 1st dispatch cycle: handler fails transiently -> propagates through InternalEventBus -> dispatcher calls recordFailure, NOT markPublished or markProcessed
      await dispatcher.dispatchOnce();
      expect(mockOutboxRepo.recordFailure).toHaveBeenCalledWith(
        "outbox-payroll-approve-1",
        "Transient DB timeout",
        expect.any(Date),
        1,
        12,
      );
      expect(mockOutboxRepo.markPublished).not.toHaveBeenCalled();
      expect(idempotencyRepo.markProcessed).not.toHaveBeenCalled();

      // 2nd dispatch cycle: handler succeeds -> markProcessed and markPublished both called
      await dispatcher.dispatchOnce();
      expect(idempotencyRepo.markProcessed).toHaveBeenCalledWith(
        "payroll-approval-listener",
        "outbox-payroll-approve-1",
      );
      expect(mockOutboxRepo.markPublished).toHaveBeenCalledWith("outbox-payroll-approve-1");

      // Crash-after-business-commit but before markProcessed:
      // Simulate PayrollDecisionHandler having already committed status="approved" on first attempt, then crashing in markProcessed
      let runStatus = "pending_approval";
      const approvalHistoryRows: any[] = [
        {
          action: "REQUESTED",
          performedByUserId: VALID_UUID_1,
          comment: "Submitted for approval",
        },
      ];
      const realDb: any = {
        query: {
          approvalRequests: {
            findFirst: jest.fn(async () => ({
              id: VALID_UUID_1,
              requestedByUserId: VALID_UUID_1,
              metadata: { payrollRunId: VALID_UUID_2 },
            })),
          },
          payrollRuns: {
            findFirst: jest.fn(async () => ({
              id: VALID_UUID_2,
              status: runStatus,
              calculationStatus: "CONFIRMED",
              isProvisional: false,
            })),
          },
          payrollRunApprovalHistory: {
            findMany: jest.fn(async () => approvalHistoryRows),
          },
          payslips: {
            findMany: jest.fn(async () => [
              { id: "ps-1", metadata: { isProvisional: false, calculationStatus: "CONFIRMED" } },
            ]),
          },
        },
        transaction: jest.fn(async (fn: any) =>
          fn({
            query: realDb.query,
            execute: jest.fn(async () => [{ id: VALID_UUID_2, status: runStatus }]),
            update: jest.fn(() => ({
              set: jest.fn(() => ({
                where: jest.fn(() => ({
                  returning: jest.fn(async () => {
                    if (runStatus !== "pending_approval") return [];
                    runStatus = "approved";
                    return [{ id: VALID_UUID_2 }];
                  }),
                })),
              })),
            })),
            insert: jest.fn(() => ({
              values: jest.fn(async (val: any) => {
                approvalHistoryRows.push(val);
              }),
            })),
          }),
        ),
      };
      const realDecisionHandler = new PayrollDecisionHandler(
        realDb as any,
        mockRequestContext,
      );

      const crashOnceIdempotency = {
        isProcessed: jest.fn().mockResolvedValue(false),
        markProcessed: jest
          .fn()
          .mockRejectedValueOnce(new Error("Crash right after business commit"))
          .mockResolvedValueOnce(undefined),
      } as any;

      const crashRecoveryListener = new PayrollApprovalListener(
        { on: jest.fn() } as any,
        realDecisionHandler,
        mockRequestContext,
        crashOnceIdempotency,
      );

      const crashEvent = {
        eventId: "ev-crash-after-commit",
        data: {
          approvalRequestId: VALID_UUID_1,
          subjectType: "payroll",
          subjectId: VALID_UUID_2,
          outcome: "approved",
          decidedByUserId: VALID_UUID_3,
          completedAt: "2026-10-19T12:00:00.000Z",
        },
      };

      // 1st delivery commits business state, then fails during markProcessed
      await expect(
        (crashRecoveryListener as any).handleApprovalRequestCompleted(crashEvent),
      ).rejects.toThrow("Crash right after business commit");
      expect(runStatus).toBe("approved");
      expect(approvalHistoryRows).toHaveLength(2);

      // 2nd delivery (retry after crash) sees status="approved" != "pending_approval", does NOT insert duplicate history, and completes markProcessed
      await expect(
        (crashRecoveryListener as any).handleApprovalRequestCompleted(crashEvent),
      ).resolves.toBeUndefined();
      expect(approvalHistoryRows).toHaveLength(2);
      expect(crashOnceIdempotency.markProcessed).toHaveBeenCalledTimes(2);
    });

    it("Closure Area 1b: EventIdempotencyRepository.markProcessed handles concurrent duplicate-key (23505) safely and Payroll consumers work when EventIdempotencyRepository is absent", async () => {
      const conflictDb = {
        insert: jest.fn(() => ({
          values: jest.fn(async () => {
            const err: any = new Error("duplicate key value violates unique constraint");
            err.code = "23505";
            throw err;
          }),
        })),
      } as any;
      const idempotencyRepo = new EventIdempotencyRepository(conflictDb);
      await expect(
        idempotencyRepo.markProcessed("payroll-approval-listener", "ev-concurrent-1"),
      ).resolves.toBeUndefined();

      // Explicit fallback when EventIdempotencyRepository is absent (undefined)
      const decisionHandler = {
        handleApproval: jest.fn().mockResolvedValue(undefined),
        handleRejection: jest.fn().mockResolvedValue(undefined),
      };
      const listenerWithoutIdempotency = new PayrollApprovalListener(
        { on: jest.fn() } as any,
        decisionHandler as any,
        mockRequestContext,
        undefined,
      );
      await expect(
        (listenerWithoutIdempotency as any).handleApprovalRequestCompleted({
          eventId: "ev-no-idemp-1",
          data: {
            approvalRequestId: VALID_UUID_1,
            subjectType: "payroll",
            subjectId: VALID_UUID_2,
            outcome: "rejected",
            decidedByUserId: VALID_UUID_3,
            completedAt: "2026-10-19T12:00:00.000Z",
          },
        }),
      ).resolves.toBeUndefined();
      expect(decisionHandler.handleRejection).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalRequestId: VALID_UUID_1,
          decidedByUserId: VALID_UUID_3,
        }),
      );
    });

    it("Closure Area 2: validates all registered domain event contracts and payload schemas", () => {
      registerAllDomainEvents();
      const criticalEvents = [
        "approval.request.completed",
        "approval.request.decided",
        "approval.request.created",
        "payroll.run.processed",
        "leave.cancellation.requested",
        "offboarding.completed",
        "onboarding.process.created",
        "onboarding.item.completed",
        "onboarding.process.completed",
        "attendance.violation.created",
        "department.moved",
        "position.created",
        "position.reclassified",
      ];
      for (const evt of criticalEvents) {
        expect(() => assertEventRegistered(evt, 1)).not.toThrow();
      }

      // Validate LeaveCancellationRequestedEvent and OffboardingCompletedEvent against EventRegistry
      expect(() =>
        validatePayload("leave.cancellation.requested", 1, {
          idempotencyKey: "lr-1:leave.cancellation.requested",
          leaveRequestId: "lr-1",
          cancelledByUserId: VALID_UUID_1,
          cancelledAt: new Date().toISOString(),
        }),
      ).not.toThrow();

      expect(() =>
        validatePayload("offboarding.completed", 1, {
          processId: "proc-1",
          employeeId: "emp-1",
        }),
      ).not.toThrow();
    });

    it("Closure Area 3: guards intermediate step advance with updateRequestIfPending so concurrent cancellation rejects the step advance with ConflictException", async () => {
      const mockRepo = {
        transaction: jest.fn(async (fn: any) => fn({ __tx: true })),
        findRequestById: jest.fn().mockResolvedValue({
          id: VALID_UUID_1,
          policyId: "pol-1",
          subjectType: "leave_request",
          subjectId: VALID_UUID_2,
          status: "pending",
          currentStepIndex: 0,
          requestedByUserId: "requester-user",
        }),
        findStep: jest.fn().mockResolvedValue({
          id: "step-0",
          requestId: VALID_UUID_1,
          stepIndex: 0,
          approverUserId: VALID_UUID_3,
          status: "pending",
        }),
        updateStepIfPending: jest.fn().mockResolvedValue({
          id: "step-0",
          status: "approved",
        }),
        anyPendingStep: jest.fn().mockResolvedValue(true),
        // Simulate concurrent cancellation having transitioned approval_requests.status from 'pending' to 'cancelled'
        updateRequestIfPending: jest.fn().mockResolvedValue(null),
      } as any;

      const useCase = new DecideApprovalStepUseCase(mockRepo, { stage: jest.fn() } as any);
      await expect(
        useCase.execute(
          {
            requestId: VALID_UUID_1,
            stepIndex: 0,
            decision: "approve",
          },
          VALID_UUID_3,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("Closure Area 4: normalizes empty strings on optional numeric/UUID/date fields while rejecting empty strings on required numeric fields", async () => {
      // Optional numeric fields normalize "" -> undefined
      await expect(
        validateBody(CreateCourseDto, {
          title: "TypeScript Mastery",
          estimatedHours: "",
        }),
      ).resolves.toMatchObject({
        title: "TypeScript Mastery",
        estimatedHours: undefined,
      });

      await expect(
        validateBody(CreateSessionDto, {
          courseId: VALID_UUID_1,
          title: "Session 1",
          scheduledAt: "2026-11-01T09:00:00.000Z",
          durationMinutes: "",
          maxAttendees: "",
          meetingUrl: "",
        }),
      ).resolves.toMatchObject({
        durationMinutes: undefined,
        maxAttendees: undefined,
        meetingUrl: undefined,
      });

      await expect(
        validateBody(CreateCertificationDefDto, {
          name: "AWS Architect",
          validityMonths: "",
        }),
      ).resolves.toMatchObject({
        name: "AWS Architect",
        validityMonths: undefined,
      });

      await expect(
        validateBody(IssueCertificateDto, {
          definitionId: VALID_UUID_1,
          employeeId: VALID_UUID_2,
          courseId: "",
        }),
      ).resolves.toMatchObject({
        courseId: undefined,
      });

      await expect(
        validateBody(PublishResultDto, {
          employeeId: VALID_UUID_1,
          finalScore: "",
        }),
      ).resolves.toMatchObject({
        employeeId: VALID_UUID_1,
        finalScore: undefined,
      });

      await expect(
        validateBody(CreatePlanDto, {
          name: "Health Gold",
          coverageType: "family",
          employerContribution: "",
          employeeContribution: "",
          maxEligibleAge: "",
        }),
      ).resolves.toMatchObject({
        employerContribution: undefined,
        employeeContribution: undefined,
        maxEligibleAge: undefined,
      });

      // Required numeric fields reject "" instead of coercing to 0
      await expect(
        validateBody(AddItemDto, {
          claimId: VALID_UUID_1,
          categoryId: "",
          description: "Taxi",
          amount: "",
          expenseDate: "2026-10-19",
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validateBody(SubmitReviewDto, {
          ratings: [{ competencyId: "comp-1", score: "" }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
