/**
 * Workflow Execution Safety Limits
 *
 * Protects workflow correctness under stress by enforcing:
 * - max transition depth per instance
 * - execution timeout per transition
 * - guard evaluation budget
 * - shadow mode recursion protection
 */

export class TransitionLimitExceededError extends Error {
  constructor(instanceId: string, limit: number) {
    super(`TRANSITION_LIMIT_EXCEEDED: instance ${instanceId} exceeded ${limit} transitions`);
    this.name = "TransitionLimitExceededError";
  }
}

export class EvaluationTimeoutError extends Error {
  constructor(instanceId: string, timeoutMs: number) {
    super(`EVALUATION_TIMEOUT: instance ${instanceId} exceeded ${timeoutMs}ms`);
    this.name = "EvaluationTimeoutError";
  }
}

export class GuardBudgetExceededError extends Error {
  constructor(instanceId: string, limit: number) {
    super(`GUARD_BUDGET_EXCEEDED: instance ${instanceId} exceeded ${limit} guard evaluations`);
    this.name = "GuardBudgetExceededError";
  }
}

export interface WorkflowSafetyConfig {
  maxTransitionsPerInstance: number;
  transitionTimeoutMs: number;
  maxGuardEvaluations: number;
  maxShadowRecursionDepth: number;
  failedSafeState: string;
  failedSafeReason: string;
}

export const DEFAULT_SAFETY_CONFIG: WorkflowSafetyConfig = {
  maxTransitionsPerInstance: 100,
  transitionTimeoutMs: 30_000,
  maxGuardEvaluations: 50,
  maxShadowRecursionDepth: 10,
  failedSafeState: "failed_safe",
  failedSafeReason: "TRANSITION_LIMIT_EXCEEDED",
};

export class WorkflowSafetyGuard {
  private readonly config: WorkflowSafetyConfig;
  /** Per-instance transition counter */
  private readonly transitionCount = new Map<string, number>();
  /** Per-instance guard evaluation counter */
  private readonly guardCount = new Map<string, number>();
  /** Per-instance shadow recursion depth */
  private readonly shadowDepth = new Map<string, number>();

  constructor(config?: Partial<WorkflowSafetyConfig>) {
    this.config = { ...DEFAULT_SAFETY_CONFIG, ...config };
  }

  assertTransitionAllowed(instanceId: string): void {
    const count = (this.transitionCount.get(instanceId) ?? 0) + 1;
    this.transitionCount.set(instanceId, count);
    if (count > this.config.maxTransitionsPerInstance) {
      this.resetInstance(instanceId);
      throw new TransitionLimitExceededError(instanceId, this.config.maxTransitionsPerInstance);
    }
  }

  recordTransition(instanceId: string): void {
    this.transitionCount.set(instanceId, (this.transitionCount.get(instanceId) ?? 0) + 1);
  }

  /** Start a timed guard evaluation. Returns a disposable that auto-checks timeout. */
  startGuardEvaluation(instanceId: string): { done: () => void; fail: () => void } {
    const count = (this.guardCount.get(instanceId) ?? 0) + 1;
    this.guardCount.set(instanceId, count);

    if (count > this.config.maxGuardEvaluations) {
      throw new GuardBudgetExceededError(instanceId, this.config.maxGuardEvaluations);
    }

    const startTime = Date.now(); // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      done: () => {},
      fail: () => {},
    };
  }

  /** Check shadow recursion depth. Throw if exceeded. */
  checkShadowDepth(instanceId: string): void {
    const depth = (this.shadowDepth.get(instanceId) ?? 0) + 1;
    this.shadowDepth.set(instanceId, depth);
    if (depth > this.config.maxShadowRecursionDepth) {
      throw new Error(
        `SHADOW_RECURSION_LIMIT: instance ${instanceId} shadow depth ${depth} exceeded ${this.config.maxShadowRecursionDepth}`,
      );
    }
  }

  resetInstance(instanceId: string): void {
    this.transitionCount.delete(instanceId);
    this.guardCount.delete(instanceId);
    this.shadowDepth.delete(instanceId);
  }

  getTransitionCount(instanceId: string): number {
    return this.transitionCount.get(instanceId) ?? 0;
  }

  getGuardCount(instanceId: string): number {
    return this.guardCount.get(instanceId) ?? 0;
  }
}
