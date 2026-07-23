/**
 * Pure transition rules for the application pipeline. This local guard is the
 * source of truth for which stage transitions are allowed. The platform
 * workflow engine (platform-workflow-engine.service.ts) can be layered on top
 * later for richer governance without changing these rules.
 */

export type ApplicationStage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";

/** Stages an application can still move out of. */
export const ACTIVE_STAGES: readonly ApplicationStage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
];

/** Terminal stages — no outgoing transitions. */
export const TERMINAL_STAGES: readonly ApplicationStage[] = [
  "hired",
  "rejected",
  "withdrawn",
];

/**
 * Allowed forward transitions plus the universal exits (reject/withdraw) that
 * are available from any active stage.
 */
export const ALLOWED_TRANSITIONS: Record<
  ApplicationStage,
  readonly ApplicationStage[]
> = {
  applied: ["screening", "rejected", "withdrawn"],
  screening: ["interview", "rejected", "withdrawn"],
  interview: ["offer", "rejected", "withdrawn"],
  offer: ["hired", "rejected", "withdrawn"],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export function isActiveStage(stage: ApplicationStage): boolean {
  return ACTIVE_STAGES.includes(stage);
}

export function isTerminalStage(stage: ApplicationStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function isAllowedTransition(
  from: ApplicationStage,
  to: ApplicationStage,
): boolean {
  if (from === to) return false;
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}
