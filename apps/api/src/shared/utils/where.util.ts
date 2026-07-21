import { and, ilike, or, type SQL } from "drizzle-orm";

export function contains(column: unknown, value?: string | null): SQL | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return ilike(column as never, `%${normalized}%`);
}

export function searchAny(
  value: string | undefined,
  ...columns: unknown[]
): SQL | undefined {
  const normalized = value?.trim();
  if (!normalized || columns.length === 0) return undefined;

  const conditions = columns
    .map((column) => ilike(column as never, `%${normalized}%`))
    .filter(Boolean);

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return or(...conditions);
}

export function combineWhere(
  ...conditions: (SQL | undefined | null)[]
): SQL | undefined {
  const filtered = conditions.filter(
    (condition) => condition !== undefined && condition !== null,
  );

  if (filtered.length === 0) return undefined;
  if (filtered.length === 1) return filtered[0];
  return and(...filtered);
}
