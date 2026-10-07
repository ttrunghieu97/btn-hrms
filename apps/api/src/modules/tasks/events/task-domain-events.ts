/**
 * task-domain-events.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical domain event type definitions.
 * All publishers and consumers share this contract.
 */

export type TaskDomainEventType =
  | "workflow.action_requested"
  | "workflow.action_completed"
  | "workflow.action_failed"
  | "task.created"
  | "task.assigned"
  | "task.unassigned"
  | "task.accepted"
  | "task.declined"
  | "task.started"
  | "task.submitted"
  | "task.revision_requested"
  | "task.completed"
  | "task.cancelled"
  | "task.deleted"
  | "task.comment_added"
  | "task.attachment_uploaded"
  | "task.overdue"
  | "task.due_soon"
  | "task.approval_overdue"
  | "task.revision_limit_reached"
  | "task.bulk_assigned"
  | "task.reassigned";

/** Base event envelope — every domain event shares this shape. */
export interface TaskDomainEvent<T = Record<string, any>> {
  /** UUID identifying this specific event instance */
  eventId: string;
  /** Kafka/NATS topic */
  eventType: TaskDomainEventType;
  /** Event schema version */
  eventVersion: number;
  /** Producing bounded context */
  producerContext: string;
  /** Company scope */
  scopeId: string | null;
  /** The task UUID */
  aggregateId: string;
  /** The user who triggered the action */
  actorUserId: string | null;
  /** For distributed tracing — links events across services */
  correlationId?: string | null;
  /** Points to the event that caused this one */
  causationId?: string | null;
  /** When the event occurred in the domain */
  occurredAt: string; // ISO 8601
  /** Business payload */
  payload: T;
}

// ── Typed payloads for each event ────────────────────────────────────────────

export interface TaskCreatedPayload {
  task: any;
  assigneeEmployeeId?: string | null;
}

export interface TaskAssignedPayload {
  task: any;
  assigneeEmployeeId: string;
  previousAssigneeId?: string | null;
}

export interface TaskStatusChangedPayload {
  task: any;
  previousStatus: string;
  nextStatus: string;
  transition: string;
  reason?: string;
}

export interface TaskCommentAddedPayload {
  taskId: string;
  commentId: string;
  authorUserId: string;
  content: string;
}

export interface TaskOverduePayload {
  taskId: string;
  taskTitle: string;
  dueDate: string;
  assigneeEmployeeId: string | null;
  assigneeUserId: string | null;
}

/** Kafka topic name for all task domain events */
export const TASK_EVENTS_TOPIC = "hrms.tasks.events";

