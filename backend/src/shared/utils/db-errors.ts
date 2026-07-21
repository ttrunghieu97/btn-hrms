type DbErrorLike = {
  code?: unknown;
  constraint?: unknown;
  detail?: unknown;
  cause?: unknown;
};

function isDbErrorLike(value: unknown): value is DbErrorLike {
  return typeof value === "object" && value !== null;
}

function unwrapDbError(err: unknown): DbErrorLike | null {
  let current: unknown = err;
  const seen = new Set<unknown>();

  while (isDbErrorLike(current) && !seen.has(current)) {
    seen.add(current);
    if (current.code || current.constraint || current.detail) return current;
    current = current.cause;
  }

  return isDbErrorLike(err) ? err : null;
}

export function getDbErrorCode(err: unknown): string | null {
  const code = unwrapDbError(err)?.code;
  return typeof code === "string" ? code : null;
}

export function getDbErrorConstraint(err: unknown): string | null {
  const constraint = unwrapDbError(err)?.constraint;
  return typeof constraint === "string" ? constraint : null;
}

export function getDbErrorDetail(err: unknown): string | null {
  const detail = unwrapDbError(err)?.detail;
  return typeof detail === "string" ? detail : null;
}

export function isUniqueViolation(err: unknown): boolean {
  return getDbErrorCode(err) === "23505";
}

export function extractUniqueField(err: unknown): string | null {
  const detail = String(getDbErrorDetail(err) || "");
  const match = detail.match(/\(([^)]+)\)=\([^)]+\) already exists/i);
  if (match?.[1]) return match[1];

  const constraint = String(getDbErrorConstraint(err) || "");
  if (constraint) return constraint;
  return null;
}
