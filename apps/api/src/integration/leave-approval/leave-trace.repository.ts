import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import * as schema from "@/infrastructure/database/schema";
import { eq, and, desc, inArray, asc } from "drizzle-orm";

export interface TraceEvent {
  id: string;
  type: string;
  label: string;
  timestamp: string;
  source: "leave" | "engine" | "integration";
  actor: string | null;
  detail: string | null;
  raw: Record<string, unknown> | null;
}

export interface LeaveTrace {
  leaveId: string;
  timeline: TraceEvent[];
  correlation: {
    approvalRequestId: string | null;
  };
}

@Injectable()
export class LeaveTraceRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async trace(leaveRequestId: string): Promise<LeaveTrace | null> {
    // 1. Verify leave exists
    const leave = await this.db.query.leaveRequests.findFirst({
      where: eq(schema.leaveRequests.id, leaveRequestId),
      with: {
        employee: true,
        leaveType: true,
        approver: true,
      },
    });
    if (!leave) return null;

    // 2. Get correlation link
    const link = await this.db.query.leaveApprovalLinks.findFirst({
      where: eq(schema.leaveApprovalLinks.leaveRequestId, leaveRequestId),
    });

    // 3. Get audit logs for this entity
    const auditLogs = await this.db.query.auditLogs.findMany({
      where: and(
        eq(schema.auditLogs.entity, "leave_request"),
        eq(schema.auditLogs.entityId, leaveRequestId),
      ),
      orderBy: [asc(schema.auditLogs.createdAt)],
    });

    // 4. Get approval steps if linked
    let approvalSteps: {
      id: string;
      status: string;
      stepIndex: number;
      approverUserId: string | null;
      decidedByUserId: string | null;
      decidedAt: Date | null;
      comment: string | null;
      createdAt: Date;
    }[] = [];
    if (link) {
      const steps = await this.db.query.approvalSteps.findMany({
        where: eq(schema.approvalSteps.requestId, link.approvalRequestId),
        orderBy: [asc(schema.approvalSteps.stepIndex)],
      });
      approvalSteps = steps.map((s) => ({
        ...s,
        decidedAt: s.decidedAt ?? null,
      }));
    }

    // 5. Get outbox events for this aggregate
    const outboxEvents = await this.db.query.eventOutbox.findMany({
      where: eq(schema.eventOutbox.aggregateId, leaveRequestId),
      orderBy: [asc(schema.eventOutbox.occurredAt)],
    });

    // 6. Build unified timeline
    const timeline: TraceEvent[] = [];

    // From audit logs
    for (const log of auditLogs) {
      const entry = auditToTrace(log);
      if (entry) timeline.push(entry);
    }

    // From approval steps
    for (const step of approvalSteps) {
      timeline.push(stepToTrace(step, leaveRequestId));
    }

    // From outbox events (deduplicate with audit logs by event type)
    const seenTypes = new Set(timeline.map((t) => t.type));
    for (const evt of outboxEvents) {
      const entry = outboxToTrace(evt);
      if (entry && !seenTypes.has(entry.type)) {
        timeline.push(entry);
        seenTypes.add(entry.type);
      }
    }

    // Sort by timestamp
    timeline.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return {
      leaveId: leaveRequestId,
      timeline,
      correlation: {
        approvalRequestId: link?.approvalRequestId ?? null,
      },
    };
  }
}

type AuditRow = {
  id: string;
  actorUserId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
};

function auditToTrace(log: AuditRow): TraceEvent | null {
  const ACTION_MAP: Record<string, { type: string; label: string; source: TraceEvent["source"] }> = {
    leave_request_create: { type: "LEAVE_CREATED", label: "Tạo đơn nghỉ phép", source: "leave" },
    leave_request_update: { type: "LEAVE_UPDATED", label: "Cập nhật đơn", source: "leave" },
    leave_request_approve: { type: "LEAVE_APPROVED", label: "Duyệt đơn", source: "leave" },
    leave_request_reject: { type: "LEAVE_REJECTED", label: "Từ chối đơn", source: "leave" },
    leave_request_cancel: { type: "LEAVE_CANCELLED", label: "Huỷ đơn", source: "leave" },
  };
  const def = ACTION_MAP[log.action];
  if (!def) return null;

  return {
    id: log.id,
    type: def.type,
    label: def.label,
    timestamp: log.createdAt.toISOString(),
    source: def.source,
    actor: log.actorUserId ?? null,
    detail: null,
    raw: (log.metadata as Record<string, unknown>) ?? null,
  };
}

function stepToTrace(
  step: {
    id: string;
    status: string;
    stepIndex: number;
    approverUserId: string | null;
    decidedByUserId: string | null;
    decidedAt: Date | null;
    comment: string | null;
    createdAt: Date;
  },
  _leaveRequestId: string,
): TraceEvent {
  const base = {
    id: step.id,
    timestamp: (step.decidedAt ?? step.createdAt).toISOString(),
    source: "engine" as const,
    actor: step.decidedByUserId ?? step.approverUserId ?? null,
    raw: {
      stepIndex: step.stepIndex,
      approverUserId: step.approverUserId,
      comment: step.comment,
    } as Record<string, unknown>,
  };

  if (step.status === "pending") {
    return {
      ...base,
      type: "ENGINE_STEP_PENDING",
      label: `Bước ${step.stepIndex + 1}: Chờ duyệt`,
      detail: null,
    };
  }
  if (step.status === "approved") {
    return {
      ...base,
      type: "ENGINE_STEP_APPROVED",
      label: `Bước ${step.stepIndex + 1}: Đã duyệt`,
      detail: step.comment ?? null,
    };
  }
  return {
    ...base,
    type: "ENGINE_STEP_DECIDED",
    label: `Bước ${step.stepIndex + 1}: ${step.status === "rejected" ? "Từ chối" : "Đã xử lý"}`,
    detail: step.comment ?? null,
  };
}

type OutboxRow = {
  id: string;
  eventType: string;
  payload: unknown;
  occurredAt: Date;
};

function outboxToTrace(evt: OutboxRow): TraceEvent | null {
  const EVENT_MAP: Record<string, { type: string; label: string }> = {
    "leave.approval.requested.v1": { type: "APPROVAL_REQUESTED", label: "Gửi yêu cầu duyệt" },
    "leave.cancellation.requested.v1": { type: "CANCELLATION_REQUESTED", label: "Yêu cầu huỷ" },
    "leave.approved.v1": { type: "LEAVE_FINAL_APPROVED", label: "Phê duyệt hoàn tất (event)" },
    "leave.rejected.v1": { type: "LEAVE_FINAL_REJECTED", label: "Từ chối hoàn tất (event)" },
  };
  // eslint-disable-next-line drizzle/enforce-name-conventions
  const baseType = evt.eventType.replace(/\.\d+$/, "").replace(/\.v\d+$/, "");
  const def = EVENT_MAP[evt.eventType] ?? EVENT_MAP[baseType];
  if (!def) return null;

  return {
    id: evt.id,
    type: def.type,
    label: def.label,
    timestamp: evt.occurredAt.toISOString(),
    source: "integration",
    actor: null,
    detail: null,
    raw: (evt.payload as Record<string, unknown>) ?? null,
  };
}
