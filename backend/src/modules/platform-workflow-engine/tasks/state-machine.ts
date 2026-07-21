/**
 * state-machine.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Pure data structure describing all valid task lifecycle transitions.
 * No side-effects, fully testable in isolation.
 */

export type TaskStatus =
  | "created"
  | "assigned"
  | "in_progress"
  | "declined"
  | "submitted"
  | "revision"
  | "completed"
  | "cancelled";

export type TaskTransition =
  | "assign"
  | "unassign"
  | "accept"
  | "reject"
  | "submit"
  | "resubmit"
  | "approve"
  | "request_revision"
  | "cancel";

export interface TransitionDef {
  from: TaskStatus | TaskStatus[];
  to: TaskStatus;
  allowedRoles: ("assignee" | "manager" | "admin" | "creator")[];
  requiresReason?: boolean;
}

export const TASK_TRANSITIONS: Record<TaskTransition, TransitionDef> = {
  assign: {
    from: ["created", "declined"],
    to: "assigned",
    allowedRoles: ["manager", "admin", "creator"],
  },
  unassign: {
    from: ["assigned"],
    to: "created",
    allowedRoles: ["manager", "admin"],
  },
  accept: {
    from: ["assigned"],
    to: "in_progress",
    allowedRoles: ["assignee"],
  },
  reject: {
    from: ["assigned"],
    to: "declined",
    allowedRoles: ["assignee"],
    requiresReason: true,
  },
  submit: {
    from: ["in_progress"],
    to: "submitted",
    allowedRoles: ["assignee"],
  },
  resubmit: {
    from: ["revision"],
    to: "submitted",
    allowedRoles: ["assignee"],
  },
  approve: {
    from: ["submitted"],
    to: "completed",
    allowedRoles: ["manager", "admin"],
  },
  request_revision: {
    from: ["submitted"],
    to: "revision",
    allowedRoles: ["manager", "admin"],
    requiresReason: true,
  },
  cancel: {
    from: [
      "created",
      "assigned",
      "in_progress",
      "submitted",
      "declined",
      "revision",
    ],
    to: "cancelled",
    allowedRoles: ["manager", "admin", "creator"],
    requiresReason: true,
  },
};

export function getAvailableTransitions(status: TaskStatus): TaskTransition[] {
  return (Object.entries(TASK_TRANSITIONS) as [TaskTransition, TransitionDef][])
    .filter(([, def]) => {
      const froms = Array.isArray(def.from) ? def.from : [def.from];
      return froms.includes(status);
    })
    .map(([name]) => name);
}

export function getTargetStatus(
  current: TaskStatus,
  transition: TaskTransition,
): TaskStatus | null {
  const def = TASK_TRANSITIONS[transition];
  if (!def) return null;
  const froms = Array.isArray(def.from) ? def.from : [def.from];
  if (!froms.includes(current)) return null;
  return def.to;
}

