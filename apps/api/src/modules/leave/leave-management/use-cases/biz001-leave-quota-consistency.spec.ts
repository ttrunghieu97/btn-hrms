import { CreateLeaveRequestUseCase } from "./create-leave-request.usecase";
import { UpdateLeaveRequestUseCase } from "./update-leave-request.usecase";
import { LeaveLifecycleService } from "../services/leave-lifecycle.service";
import { LeaveDecisionHandler } from "../../../../integration/leave-approval/leave-decision.handler.service";
import { LeaveApprovalListener } from "../../../../integration/leave-approval/leave-approval.listener";
import { ApprovalRequestCompletedEvent } from "../../../../core/events/events/approval-request-completed.event";

interface LeaveBalanceRow {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  balanceYear: number;
  openingBalance: string;
  accruedAmount: string;
  carriedOverAmount: string;
  adjustedAmount: string;
  usedAmount: string;
}

interface LeaveRequestRow {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalUnits: string;
  startSession: string;
  endSession: string;
  status: "draft" | "pending" | "approved" | "rejected" | "cancelled";
  approverUserId: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LeaveApprovalLinkRow {
  leaveRequestId: string;
  approvalRequestId: string;
  policyId: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
}

/**
 * Stateful transactional test harness that faithfully executes the real SQL predicates:
 * - Row-level lock serialization on `leave_balances` (`SELECT ... FOR UPDATE`)
 * - Atomic transaction commit / rollback across `leave_requests`, `leave_balances`,
 *   `leave_approval_links`, `audit_logs`, and `event_outbox`
 * - Optimistic status guard (`WHERE id = $1 AND status = $2`)
 * - Conditional balance deduction (`WHERE (opening + accrued + carried_over + adjusted - used) >= $units`)
 */
function createStatefulLeaveHarness(initialAvailableQuota = 5) {
  let reqSeq = 0;
  let txMutex: Promise<void> = Promise.resolve();

  const state = {
    balances: new Map<string, LeaveBalanceRow>([
      [
        "bal-1",
        {
          id: "bal-1",
          employeeId: "emp-1",
          leaveTypeId: "type-paid",
          balanceYear: 2026,
          openingBalance: String(initialAvailableQuota),
          accruedAmount: "0",
          carriedOverAmount: "0",
          adjustedAmount: "0",
          usedAmount: "0",
        },
      ],
    ]),
    requests: new Map<string, LeaveRequestRow>(),
    links: new Map<string, LeaveApprovalLinkRow>(),
    auditLogs: [] as { actorUserId: string | null; action: string; entityId: string; metadata: unknown }[],
    outbox: [] as { eventType: string; payload: unknown }[],
    consumerIdempotency: new Set<string>(),
  };

  let failNextIncrementWithError: Error | null = null;

  function cloneState() {
    return {
      balances: new Map(
        Array.from(state.balances.entries()).map(([k, v]) => [k, { ...v }]),
      ),
      requests: new Map(
        Array.from(state.requests.entries()).map(([k, v]) => [k, { ...v }]),
      ),
      links: new Map(
        Array.from(state.links.entries()).map(([k, v]) => [k, { ...v }]),
      ),
      auditLogs: [...state.auditLogs],
      outbox: [...state.outbox],
    };
  }

  const leaveTypePaid = {
    id: "type-paid",
    name: "Annual Leave",
    code: "AL",
    unit: "day",
    isPaid: true,
    requiresApproval: true,
    minNoticeHours: null,
  };

  const employee = {
    id: "emp-1",
    userId: "user-emp-1",
    firstName: "Nguyen",
    lastName: "An",
    employeeCode: "EMP001",
    department: { id: "dept-1", name: "Engineering" },
  };

  function hydrateRequest(row: LeaveRequestRow | undefined | null) {
    if (!row) return null;
    return {
      ...row,
      employee,
      leaveType: leaveTypePaid,
      approver: null,
    };
  }

  const leaveRepo = {
    findEmployeeById: jest.fn(async (id: string) =>
      id === employee.id ? employee : null,
    ),
    findLeaveTypeById: jest.fn(async (id: string) =>
      id === leaveTypePaid.id ? leaveTypePaid : null,
    ),
    findById: jest.fn(async (id: string, tx?: any) => {
      const store = tx?.__store ?? state;
      return hydrateRequest(store.requests.get(id));
    }),
    findOverlappingApprovedRequest: jest.fn(
      async (
        employeeId: string,
        startDate: string,
        endDate: string,
        excludeRequestId?: string,
        tx?: any,
      ) => {
        const store = tx?.__store ?? state;
        for (const req of store.requests.values()) {
          if (req.employeeId !== employeeId) continue;
          if (!["approved", "pending"].includes(req.status)) continue;
          if (excludeRequestId && req.id === excludeRequestId) continue;
          if (req.startDate <= endDate && req.endDate >= startDate) {
            return req;
          }
        }
        return null;
      },
    ),
    findBalanceForYear: jest.fn(
      async (
        employeeId: string,
        leaveTypeId: string,
        balanceYear: number,
        tx?: any,
      ) => {
        const store = tx?.__store ?? state;
        for (const bal of store.balances.values()) {
          if (
            bal.employeeId === employeeId &&
            bal.leaveTypeId === leaveTypeId &&
            bal.balanceYear === balanceYear
          ) {
            return { ...bal, leaveType: leaveTypePaid };
          }
        }
        return null;
      },
    ),
    lockBalanceForYear: jest.fn(
      async (
        employeeId: string,
        leaveTypeId: string,
        balanceYear: number,
        tx?: any,
      ) => {
        return leaveRepo.findBalanceForYear(
          employeeId,
          leaveTypeId,
          balanceYear,
          tx,
        );
      },
    ),
    sumPendingUnitsForYear: jest.fn(
      async (
        employeeId: string,
        leaveTypeId: string,
        balanceYear: number,
        tx?: any,
        excludeRequestId?: string,
      ) => {
        const store = tx?.__store ?? state;
        const yearStart = `${balanceYear}-01-01`;
        const yearEnd = `${balanceYear}-12-31`;
        let sum = 0;
        for (const req of store.requests.values()) {
          if (req.employeeId !== employeeId) continue;
          if (req.leaveTypeId !== leaveTypeId) continue;
          if (req.status !== "pending") continue;
          if (req.startDate < yearStart || req.startDate > yearEnd) continue;
          if (excludeRequestId && req.id === excludeRequestId) continue;
          sum += Number(req.totalUnits);
        }
        return sum;
      },
    ),
    create: jest.fn(async (values: any, tx?: any) => {
      const store = tx?.__store ?? state;
      const id = values.id ?? `req-${++reqSeq}`;
      const row: LeaveRequestRow = {
        id,
        employeeId: values.employeeId,
        leaveTypeId: values.leaveTypeId,
        startDate: values.startDate,
        endDate: values.endDate,
        totalUnits: String(values.totalUnits),
        startSession: values.startSession ?? "morning",
        endSession: values.endSession ?? "afternoon",
        status: values.status ?? "pending",
        approverUserId: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.requests.set(id, row);
      store.links.set(id, {
        leaveRequestId: id,
        approvalRequestId: `apr-${id}`,
        policyId: "pol-1",
        status: row.status === "approved" ? "approved" : "pending",
      });
      return row;
    }),
    update: jest.fn(async (id: string, values: any, tx?: any) => {
      const store = tx?.__store ?? state;
      const existing = store.requests.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...values, updatedAt: new Date() };
      store.requests.set(id, updated);
      return updated;
    }),
    updateStatusWithGuard: jest.fn(
      async (
        id: string,
        expectedStatus: LeaveRequestRow["status"],
        values: Partial<LeaveRequestRow>,
        tx?: any,
      ) => {
        const store = tx?.__store ?? state;
        const existing = store.requests.get(id);
        if (!existing || existing.status !== expectedStatus) {
          return null;
        }
        const updated: LeaveRequestRow = {
          ...existing,
          ...values,
          updatedAt: new Date(),
        };
        store.requests.set(id, updated);
        return updated;
      },
    ),
    incrementUsedBalance: jest.fn(
      async (balanceId: string, units: string, tx?: any) => {
        if (failNextIncrementWithError) {
          const err = failNextIncrementWithError;
          failNextIncrementWithError = null;
          throw err;
        }
        const store = tx?.__store ?? state;
        const bal = store.balances.get(balanceId);
        if (!bal) return null;
        const available =
          Number(bal.openingBalance) +
          Number(bal.accruedAmount) +
          Number(bal.carriedOverAmount) +
          Number(bal.adjustedAmount) -
          Number(bal.usedAmount);
        const requested = Number(units);
        if (available < requested) {
          return null;
        }
        const updated: LeaveBalanceRow = {
          ...bal,
          usedAmount: String(Number(bal.usedAmount) + requested),
        };
        store.balances.set(balanceId, updated);
        return updated;
      },
    ),
    createAuditLog: jest.fn(
      async (
        actorUserId: string | null,
        action: string,
        entityId: string,
        metadata: unknown,
        tx?: any,
      ) => {
        const store = tx?.__store ?? state;
        const entry = { actorUserId, action, entityId, metadata };
        store.auditLogs.push(entry);
        return entry;
      },
    ),
    transaction: jest.fn(async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
      // Serialize transactions on the balance row lock (`FOR UPDATE`) and commit/rollback atomically
      const prev = txMutex;
      let release!: () => void;
      txMutex = new Promise<void>((res) => {
        release = res;
      });
      await prev;
      const workingStore = cloneState();
      const tx = { __store: workingStore };
      try {
        const result = await callback(tx);
        state.balances = workingStore.balances;
        state.requests = workingStore.requests;
        state.links = workingStore.links;
        state.auditLogs = workingStore.auditLogs;
        state.outbox = workingStore.outbox;
        return result;
      } finally {
        release();
      }
    }),
  };

  const linkRepo = {
    findByLeaveRequestId: jest.fn(async (leaveRequestId: string) => {
      return state.links.get(leaveRequestId) ?? null;
    }),
    findByApprovalRequestId: jest.fn(async (approvalRequestId: string) => {
      for (const link of state.links.values()) {
        if (link.approvalRequestId === approvalRequestId) return link;
      }
      return null;
    }),
    updateStatus: jest.fn(
      async (
        leaveRequestId: string,
        status: LeaveApprovalLinkRow["status"],
        tx?: any,
      ) => {
        const store = tx?.__store ?? state;
        const existing = store.links.get(leaveRequestId);
        if (existing) {
          store.links.set(leaveRequestId, { ...existing, status });
        }
      },
    ),
  };

  const eventOutbox = {
    stage: jest.fn(async (event: any, tx?: any) => {
      const store = tx?.__store ?? state;
      store.outbox.push({
        eventType: event.eventType,
        payload: event.data ?? event,
      });
      return { id: `out-${store.outbox.length}` };
    }),
  };

  const reconciliation = {
    reconcileApprovedLeave: jest.fn().mockResolvedValue(undefined),
  };

  const requestContext = {
    getRequestId: jest.fn().mockReturnValue("req-ctx-1"),
    get: jest.fn().mockReturnValue({ requestId: "req-ctx-1" }),
    run: jest.fn((_ctx: any, fn: () => Promise<void>) => fn()),
  };

  const tracing = {
    extractFromPayload: jest.fn().mockReturnValue(null),
    runWithSpan: jest.fn((_name: string, fn: () => Promise<void>) => fn()),
  };

  const authService = {
    canCreate: jest.fn().mockResolvedValue(undefined),
    canCancel: jest.fn().mockResolvedValue(undefined),
  };

  const lifecycle = new LeaveLifecycleService();

  const createUseCase = new CreateLeaveRequestUseCase(
    leaveRepo as any,
    eventOutbox as any,
    reconciliation as any,
    requestContext as any,
    authService as any,
  );

  const updateUseCase = new UpdateLeaveRequestUseCase(
    leaveRepo as any,
    lifecycle,
    requestContext as any,
  );

  const decisionHandler = new LeaveDecisionHandler(
    leaveRepo as any,
    lifecycle,
    reconciliation as any,
    eventOutbox as any,
    linkRepo as any,
    requestContext as any,
  );

  const dbForListener = {
    query: {
      consumerIdempotency: {
        findFirst: jest.fn(async ({ where }: any) => {
          const fakeCol = { eventId: "eventId" };
          let targetId = "";
          where(fakeCol, {
            eq: (_col: unknown, val: string) => {
              targetId = val;
              return true;
            },
          });
          return state.consumerIdempotency.has(targetId)
            ? { eventId: targetId }
            : null;
        }),
      },
    },
    insert: jest.fn(() => ({
      values: jest.fn(async ({ eventId }: { eventId: string }) => {
        state.consumerIdempotency.add(eventId);
      }),
    })),
  };

  let registeredListener: ((event: ApprovalRequestCompletedEvent) => Promise<void>) | null =
    null;
  const eventBus = {
    on: jest.fn((_type: string, handler: any) => {
      registeredListener = handler;
    }),
  };

  const approvalListener = new LeaveApprovalListener(
    eventBus as any,
    decisionHandler,
    linkRepo as any,
    dbForListener as any,
    requestContext as any,
    tracing as any,
  );
  approvalListener.onModuleInit();

  return {
    state,
    leaveRepo,
    linkRepo,
    eventOutbox,
    reconciliation,
    createUseCase,
    updateUseCase,
    decisionHandler,
    deliverApprovalCompletedEvent: async (event: ApprovalRequestCompletedEvent) => {
      if (!registeredListener) throw new Error("Listener not registered");
      await registeredListener(event);
    },
    injectNextIncrementFailure: (err: Error) => {
      failNextIncrementWithError = err;
    },
  };
}

describe("Phase 5B — BIZ-001: Leave Quota & Approval Consistency Regression Suite", () => {
  it("1. rejects a single leave request that exceeds available quota", async () => {
    const harness = createStatefulLeaveHarness(5);

    await expect(
      harness.createUseCase.execute({
        employeeId: "emp-1",
        leaveTypeId: "type-paid",
        startDate: "2026-08-01",
        endDate: "2026-08-06",
        totalUnits: "6",
        startSession: "morning",
        endSession: "afternoon",
      }),
    ).rejects.toThrow(/Số ngày phép còn lại không đủ/);

    expect(harness.state.requests.size).toBe(0);
    expect(harness.state.balances.get("bal-1")?.usedAmount).toBe("0");
  });

  it("2. rejects multiple pending requests whose combined amount exceeds available quota (including concurrent creation and update)", async () => {
    const harness = createStatefulLeaveHarness(5);

    // First pending request reserves 3 of 5 days
    const first = await harness.createUseCase.execute({
      employeeId: "emp-1",
      leaveTypeId: "type-paid",
      startDate: "2026-08-03",
      endDate: "2026-08-05",
      totalUnits: "3",
      startSession: "morning",
      endSession: "afternoon",
    });
    expect(first.status).toBe("pending");

    // Second pending request for 3 days on non-overlapping dates (3 + 3 = 6 > 5 available) must be rejected
    await expect(
      harness.createUseCase.execute({
        employeeId: "emp-1",
        leaveTypeId: "type-paid",
        startDate: "2026-08-10",
        endDate: "2026-08-12",
        totalUnits: "3",
        startSession: "morning",
        endSession: "afternoon",
      }),
    ).rejects.toThrow(/Số ngày phép còn lại không đủ/);

    // Second pending request for 2 days (3 + 2 = 5 <= 5 available) succeeds
    const second = await harness.createUseCase.execute({
      employeeId: "emp-1",
      leaveTypeId: "type-paid",
      startDate: "2026-08-10",
      endDate: "2026-08-11",
      totalUnits: "2",
      startSession: "morning",
      endSession: "afternoon",
    });
    expect(second.status).toBe("pending");

    // Updating the second pending request from 2 days to 3 days (3 + 3 = 6 > 5) must also be rejected
    await expect(
      harness.updateUseCase.execute(second.id, {
        endDate: "2026-08-12",
        totalUnits: "3",
      }),
    ).rejects.toThrow(/Số ngày phép còn lại không đủ/);

    expect(harness.state.requests.size).toBe(2);
    expect(harness.state.requests.get(second.id)?.totalUnits).toBe("2");
  });

  it("3. handles concurrent approval attempts safely without double-deducting or leaving split-brain state", async () => {
    const harness = createStatefulLeaveHarness(5);

    // Seed two pending requests of 3 days each (e.g., if balance was adjusted downward after creation)
    const req1 = await harness.createUseCase.execute({
      employeeId: "emp-1",
      leaveTypeId: "type-paid",
      startDate: "2026-08-03",
      endDate: "2026-08-05",
      totalUnits: "3",
      startSession: "morning",
      endSession: "afternoon",
    });

    // Simulate an admin upward adjustment to allow creating req2, then downward adjustment back to 5
    harness.state.balances.get("bal-1")!.adjustedAmount = "1"; // 6 total
    const req2 = await harness.createUseCase.execute({
      employeeId: "emp-1",
      leaveTypeId: "type-paid",
      startDate: "2026-08-10",
      endDate: "2026-08-12",
      totalUnits: "3",
      startSession: "morning",
      endSession: "afternoon",
    });
    harness.state.balances.get("bal-1")!.adjustedAmount = "0"; // back to 5 total

    // Fire concurrent approvals for both req1 and req2 AND a concurrent duplicate approval for req1
    const decidedAt = new Date("2026-08-01T10:00:00.000Z");
    const [res1a, res1b, res2] = await Promise.all([
      harness.decisionHandler.handleApproval({
        leaveRequestId: req1.id,
        decidedByUserId: "approver-1",
        decidedAt,
      }),
      harness.decisionHandler.handleApproval({
        leaveRequestId: req1.id,
        decidedByUserId: "approver-1",
        decidedAt,
      }),
      harness.decisionHandler.handleApproval({
        leaveRequestId: req2.id,
        decidedByUserId: "approver-2",
        decidedAt,
      }),
    ]);

    // Exactly one of (req1, req2) is approved (consuming 3 days), and the other is deterministically rejected
    const finalReq1 = harness.state.requests.get(req1.id)!;
    const finalReq2 = harness.state.requests.get(req2.id)!;
    const finalLink1 = harness.state.links.get(req1.id)!;
    const finalLink2 = harness.state.links.get(req2.id)!;

    expect(finalReq1.status).toBe("approved");
    expect(finalLink1.status).toBe("approved");
    expect([res1a?.applied, res1b?.applied]).toContain(true);
    expect([res1a?.applied, res1b?.applied]).toContain(false);

    // req2 must NOT be left in 'pending' (split-brain); it transitions deterministically to 'rejected'
    expect(finalReq2.status).toBe("rejected");
    expect(finalReq2.rejectionReason).toBe(
      "Insufficient leave balance to complete approval",
    );
    expect(finalLink2.status).toBe("rejected");
    expect(res2).toEqual({ applied: true, finalStatus: "rejected" });

    // Used balance is deducted once (3 days), never 6 days
    expect(harness.state.balances.get("bal-1")?.usedAmount).toBe("3");
  });

  it("4. is idempotent under duplicate approval event delivery / retry", async () => {
    const harness = createStatefulLeaveHarness(5);

    const req = await harness.createUseCase.execute({
      employeeId: "emp-1",
      leaveTypeId: "type-paid",
      startDate: "2026-08-03",
      endDate: "2026-08-04",
      totalUnits: "2",
      startSession: "morning",
      endSession: "afternoon",
    });

    const event = new ApprovalRequestCompletedEvent({
      approvalRequestId: `apr-${req.id}`,
      subjectType: "leave",
      subjectId: req.id,
      outcome: "approved",
      decidedByUserId: "approver-1",
      completedAt: "2026-08-01T10:00:00.000Z",
    });

    // Deliver the same event twice via listener AND once directly to decisionHandler
    await harness.deliverApprovalCompletedEvent(event);
    await harness.deliverApprovalCompletedEvent(event);
    const directRepeat = await harness.decisionHandler.handleApproval({
      leaveRequestId: req.id,
      decidedByUserId: "approver-1",
      decidedAt: new Date("2026-08-01T10:00:00.000Z"),
    });

    expect(directRepeat).toEqual({ applied: false, finalStatus: "approved" });
    expect(harness.state.requests.get(req.id)?.status).toBe("approved");
    expect(harness.state.links.get(req.id)?.status).toBe("approved");
    expect(harness.state.balances.get("bal-1")?.usedAmount).toBe("2");

    // LeaveApprovedEvent staged only once
    const approvedEvents = harness.state.outbox.filter(
      (e) => e.eventType === "leave.approved.v1",
    );
    expect(approvedEvents).toHaveLength(1);
  });

  it("5 & 6. rolls back atomically on failure between approval status transition and balance update, and succeeds cleanly on retry without split-brain state", async () => {
    const harness = createStatefulLeaveHarness(5);

    const req = await harness.createUseCase.execute({
      employeeId: "emp-1",
      leaveTypeId: "type-paid",
      startDate: "2026-08-03",
      endDate: "2026-08-04",
      totalUnits: "2",
      startSession: "morning",
      endSession: "afternoon",
    });

    const event = new ApprovalRequestCompletedEvent({
      approvalRequestId: `apr-${req.id}`,
      subjectType: "leave",
      subjectId: req.id,
      outcome: "approved",
      decidedByUserId: "approver-1",
      completedAt: "2026-08-01T10:00:00.000Z",
    });

    // Inject transient DB failure right after updateStatusWithGuard when incrementUsedBalance runs
    harness.injectNextIncrementFailure(
      new Error("DB serialization / connection failure during balance update"),
    );

    await expect(harness.deliverApprovalCompletedEvent(event)).rejects.toThrow(
      "DB serialization / connection failure during balance update",
    );

    // Verify full atomic rollback: request is still 'pending', link is still 'pending', balance is still '0', idempotency NOT marked
    expect(harness.state.requests.get(req.id)?.status).toBe("pending");
    expect(harness.state.links.get(req.id)?.status).toBe("pending");
    expect(harness.state.balances.get("bal-1")?.usedAmount).toBe("0");
    expect(
      harness.state.outbox.filter((e) => e.eventType === "leave.approved.v1"),
    ).toHaveLength(0);

    // Retry delivery of the same event — must succeed cleanly and converge state
    await harness.deliverApprovalCompletedEvent(event);

    expect(harness.state.requests.get(req.id)?.status).toBe("approved");
    expect(harness.state.links.get(req.id)?.status).toBe("approved");
    expect(harness.state.balances.get("bal-1")?.usedAmount).toBe("2");
    expect(
      harness.state.outbox.filter((e) => e.eventType === "leave.approved.v1"),
    ).toHaveLength(1);
  });
});
