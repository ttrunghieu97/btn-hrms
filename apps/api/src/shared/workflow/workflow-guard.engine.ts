import type { WorkflowGuard } from "./workflow-definition";

type GuardContext = Record<string, unknown>;

/**
 * Evaluates a guard condition against the given workflow context.
 * Pure function — no side effects, no DB access.
 * Returns true if guard passes, false if blocked.
 */
export function evaluateGuard(
  guard: WorkflowGuard | undefined,
  context: GuardContext,
): boolean {
  if (!guard) return true;

  if (guard.type === "expression") {
    return evaluateExpression(guard.expression, context);
  }

  return true;
}

function evaluateExpression(
  expression: string,
  context: GuardContext,
): boolean {
  try {
    // Support simple equality checks: field == value
    const eqMatch = expression.match(/^context\.(\w+)\s*==\s*(.+)$/);
    if (eqMatch) {
      const field = eqMatch[1]!;
      const rawValue = eqMatch[2]!.trim();
      const actualValue = context[field];
      return String(actualValue) === rawValue.replace(/^"|"$/g, "");
    }

    // Support not-equal: field != value
    const neqMatch = expression.match(/^context\.(\w+)\s*!=\s*(.+)$/);
    if (neqMatch) {
      const field = neqMatch[1]!;
      const rawValue = neqMatch[2]!.trim();
      const actualValue = context[field];
      return String(actualValue) !== rawValue.replace(/^"|"$/g, "");
    }

    // Support truthy checks: context.field (evaluates to true if field exists and is truthy)
    const truthyMatch = expression.match(/^context\.(\w+)$/);
    if (truthyMatch) {
      return !!context[truthyMatch[1]!];
    }

    // Fallback: log unknown expression and allow
    console.warn(`Unknown guard expression: ${expression}`);
    return true;
  } catch {
    return false;
  }
}
