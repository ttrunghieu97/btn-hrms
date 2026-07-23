/**
 * Generic workflow engine core.
 *
 * Extracted from Task workflow when a second workflow type (Leave) emerged.
 *
 * Domain-neutral: states, actions, transitions, and guards are
 * provided by domain configs, not hardcoded here.
 *
 * This file has ZERO knowledge of Task, Leave, or any domain.
 */

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

/** A symbol representing a workflow state. */
export type WorkflowState = string;

/** A symbol representing a user-triggerable action. */
export type WorkflowAction = string;

/** A role or permission level for guard checks. */
export type ActorRole = string;

/** A user/system actor performing a transition. */
export interface WorkflowActor {
  id: string;
  role: ActorRole;
}

/** One allowed transition in the state machine. */
export interface WorkflowTransitionDef {
  from: WorkflowState;
  action: WorkflowAction;
  to: WorkflowState;
  /** Who may trigger this transition. Empty = anyone. */
  allowedRoles: readonly ActorRole[];
  /** Requires reason text. */
  requiresReason?: boolean;
  /** Requires result text. */
  requiresResult?: boolean;
  /** Requires assignee/target selection. */
  requiresAssignee?: boolean;
}

/** The current state snapshot. */
export interface WorkflowSnapshot {
  state: WorkflowState;
  [key: string]: unknown;
}

export type WorkflowResult =
  | { ok: true; toState: WorkflowState }
  | { ok: false; reason: 'not_allowed' | 'invalid_action' | 'guard_denied' | 'custom'; customReason?: string };

/* ------------------------------------------------------------------ */
/* Machine factory                                                      */
/* ------------------------------------------------------------------ */

/**
 * Creates a full state machine from a list of transition definitions.
 *
 * Usage:
 * ```ts
 * const machine = createMachine(LEAVE_TRANSITIONS);
 * machine.canTransition(snapshot, 'approve', actor);
 * ```
 */
export function createMachine(defs: readonly WorkflowTransitionDef[]) {
  const byFrom = new Map<WorkflowState, WorkflowTransitionDef[]>();
  const actionsByState = new Map<WorkflowState, WorkflowAction[]>();

  for (const d of defs) {
    if (!byFrom.has(d.from)) byFrom.set(d.from, []);
    byFrom.get(d.from)!.push(d);
    if (!actionsByState.has(d.from)) actionsByState.set(d.from, []);
    actionsByState.get(d.from)!.push(d.action);
  }

  return {
    /** Find a specific transition definition. */
    find(from: WorkflowState, action: WorkflowAction): WorkflowTransitionDef | undefined {
      return byFrom.get(from)?.find((t) => t.action === action);
    },

    /** All valid actions from a given state. */
    getAvailableActions(state: WorkflowState): WorkflowAction[] {
      return actionsByState.get(state) ?? [];
    },

    /** Target state after action, or null. */
    getNextState(from: WorkflowState, action: WorkflowAction): WorkflowState | null {
      return this.find(from, action)?.to ?? null;
    },

    /** Check whether the actor may perform action. No side effects. */
    canTransition(
      snapshot: WorkflowSnapshot,
      action: WorkflowAction,
      actor: WorkflowActor,
    ): WorkflowResult {
      const t = this.find(snapshot.state, action);
      if (!t) return { ok: false, reason: 'invalid_action' };
      if (t.allowedRoles.length > 0 && !t.allowedRoles.includes(actor.role)) {
        return { ok: false, reason: 'guard_denied' };
      }
      return { ok: true, toState: t.to };
    },

    /** All states referenced in this machine (as from or to). */
    getAllStates(): WorkflowState[] {
      const set = new Set<WorkflowState>();
      for (const d of defs) { set.add(d.from); set.add(d.to); }
      return Array.from(set);
    },

    /** All actions defined in this machine. */
    getAllActions(): WorkflowAction[] {
      const set = new Set<WorkflowAction>();
      for (const d of defs) { set.add(d.action); }
      return Array.from(set);
    },
  };
}

export type WorkflowMachine = ReturnType<typeof createMachine>;
