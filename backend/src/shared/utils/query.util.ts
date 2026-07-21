/**
 * Parses a comma-separated string of fields into a Drizzle-compatible columns selection object.
 * Example: "id,name" -> { id: true, name: true }
 */
export function parseFields(
  fields?: string,
  primaryKey = "username",
  allowed?: readonly string[],
): Record<string, boolean> | undefined {
  if (!fields) return undefined;
  const selection: Record<string, boolean> = {};

  // Always include the identifier
  selection[primaryKey] = true;

  const allowedSet = allowed ? new Set(allowed) : null;

  fields.split(",").forEach((field) => {
    const trimmed = field.trim();
    if (trimmed) {
      if (allowedSet && !allowedSet.has(trimmed)) return;
      selection[trimmed] = true;
    }
  });
  return selection;
}

/**
 * Parses a comma-separated string of relations into a Drizzle-compatible 'with' object.
 * Example: "department,user" -> { department: true, user: true }
 */
export function parseInclude<const TAllowed extends readonly string[]>(
  include?: string,
  allowed?: TAllowed,
): Partial<Record<TAllowed[number], true>> | undefined {
  if (!include) return undefined;
  const relations: Partial<Record<TAllowed[number], true>> = {};
  const allowedSet = allowed ? new Set(allowed) : null;
  include.split(",").forEach((rel) => {
    const trimmed = rel.trim();
    if (trimmed) {
      if (allowedSet && !allowedSet.has(trimmed)) return;
      relations[trimmed as TAllowed[number]] = true;
    }
  });
  return Object.keys(relations).length > 0 ? relations : undefined;
}

/**
 * Lightweight post-processing filter for data objects if DB-level selection isn't possible
 * or for deep nested filtering not easily handled by basic Drizzle 'with' strings.
 */
export function applyFieldSelection<T>(data: T, fields?: string): Partial<T> {
  if (!fields || !data) return data;
  const fieldList = fields.split(",").map((f) => f.trim());

  if (Array.isArray(data)) {
    return data.map((item) => {
      const filtered: any = {};
      fieldList.forEach((f) => {
        if (f in item) filtered[f] = item[f];
      });
      return filtered;
    }) as any;
  }

  const filtered: any = {};
  fieldList.forEach((f) => {
    if (f in (data as any)) filtered[f] = (data as any)[f];
  });
  return filtered;
}
