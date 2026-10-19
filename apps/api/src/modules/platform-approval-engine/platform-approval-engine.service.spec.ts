import { PlatformApprovalEngineService } from "./platform-approval-engine.service";
import { ApprovalInboxRepository } from "../../integration/leave-approval/approval-inbox.repository";
import { LeaveApprovalIntegrationHandler } from "../../integration/leave-approval/leave-approval-integration.handler";
import { EventIdempotencyRepository } from "../../infrastructure/repositories/event-idempotency.repository";

describe(PlatformApprovalEngineService.name, () => {
  it("rejects decisions from users who are not assigned to the approval step", async () => {
    const repo = {
      findRequestById: jest.fn().mockResolvedValue({ id: "req-1", status: "pending" }),
      findStep: jest.fn().mockResolvedValue({
        id: "step-1",
        status: "pending",
        approverUserId: "approver-1",
      }),
      isUserActiveDelegateOf: jest.fn().mockResolvedValue(false),
      updateStep: jest.fn(),
      updateRequest: jest.fn(),
      anyPendingStep: jest.fn(),
    };
    const service = new PlatformApprovalEngineService(repo as any);

    await expect(
      service.decideStep({
        requestId: "req-1",
        stepIndex: 0,
        decision: "approve",
        decidedByUserId: "user-2",
      }),
    ).rejects.toThrow("Approval step is assigned to another approver");

    expect(repo.updateStep).not.toHaveBeenCalled();
  });

  it("skips all pending steps via skipPendingSteps when cancelling a multi-step approval request", async () => {
    const repo = {
      findRequestById: jest.fn().mockResolvedValue({
        id: "req-multi",
        status: "pending",
        currentStepIndex: 0,
      }),
      skipPendingSteps: jest.fn().mockResolvedValue(undefined),
      updateRequest: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PlatformApprovalEngineService(repo as any);

    await service.cancelApproval("req-multi");

    expect(repo.skipPendingSteps).toHaveBeenCalledWith("req-multi");
    expect(repo.updateRequest).toHaveBeenCalledWith(
      "req-multi",
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("filters approvalRequests by approvalRequestIds in ApprovalInboxRepository.listByApprover", async () => {
    let capturedWhereArg: unknown;
    const orderByMock = jest.fn().mockResolvedValue([]);
    const whereSecondMock = jest.fn((cond) => {
      capturedWhereArg = cond;
      return { orderBy: orderByMock };
    });
    const chainMock: any = {
      innerJoin: jest.fn(() => chainMock),
      leftJoin: jest.fn(() => chainMock),
      where: whereSecondMock,
    };
    let selectCall = 0;
    const dbMock = {
      select: jest.fn(() => {
        selectCall += 1;
        if (selectCall === 1) {
          return {
            from: jest.fn(() => ({
              where: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue([
                  { approvalRequestId: "11111111-1111-1111-1111-111111111111", stepIndex: 0 },
                ]),
              })),
            })),
          };
        }
        return {
          from: jest.fn(() => chainMock),
        };
      }),
    };

    const inboxRepo = new ApprovalInboxRepository(dbMock as any);
    await inboxRepo.listByApprover("approver-1");

    const { inspect } = await import("util");
    expect(whereSecondMock).toHaveBeenCalledTimes(1);
    expect(inspect(capturedWhereArg, { depth: 10 })).toContain("11111111-1111-1111-1111-111111111111");
  });

  it("persists raw UUID eventId and filters by consumerId in LeaveApprovalIntegrationHandler", async () => {
    const insertedRows: any[] = [];
    const findFirstMock = jest.fn().mockImplementation(({ where }: any) => {
      const andFn = jest.fn((...args) => ({ op: "and", args }));
      const eqFn = jest.fn((col, val) => ({ op: "eq", col, val }));
      const expr = where({ consumerId: "col_consumer", eventId: "col_event" }, { and: andFn, eq: eqFn });
      expect(expr).toEqual({
        op: "and",
        args: [
          { op: "eq", col: "col_consumer", val: "leave-approval-integration" },
          { op: "eq", col: "col_event", val: "22222222-2222-2222-2222-222222222222" },
        ],
      });
      return Promise.resolve(null);
    });
    const dbMock = {
      query: {
        consumerIdempotency: { findFirst: findFirstMock },
      },
      insert: jest.fn(() => ({
        values: jest.fn((row) => {
          insertedRows.push(row);
          return Promise.resolve();
        }),
      })),
    };
    const handler = new LeaveApprovalIntegrationHandler(
      { on: jest.fn() } as any,
      { resolve: jest.fn().mockResolvedValue("pol-1") } as any,
      { requestApproval: jest.fn().mockResolvedValue({ id: "app-1" }) } as any,
      { findByLeaveRequestId: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) } as any,
      new EventIdempotencyRepository(dbMock as any),
      { get: jest.fn() } as any,
    );

    await (handler as any).handleLeaveApprovalRequested({
      eventId: "22222222-2222-2222-2222-222222222222",
      data: {
        leaveRequestId: "leave-1",
        employeeId: "emp-1",
        leaveTypeId: "lt-1",
        requestedByUserId: "user-1",
      },
    });

    expect(insertedRows).toEqual([
      {
        consumerId: "leave-approval-integration",
        eventId: "22222222-2222-2222-2222-222222222222",
      },
    ]);
  });
});

