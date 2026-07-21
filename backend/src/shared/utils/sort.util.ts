import { asc, desc, type SQL } from "drizzle-orm";

export type SortDirection = "asc" | "desc";

export interface SortFieldMap {
  [field: string]: unknown;
}

export interface ResolveSortOrderOptions<TField extends string> {
  sort?: string;
  fields: Record<TField, unknown>;
  defaultSort: { field: TField; direction: SortDirection }[];
  aliasMap?: Record<string, TField>;
  tieBreaker?: SQL[];
}

export function resolveSortOrder<TField extends string>(
  options: ResolveSortOrderOptions<TField>,
): SQL[] {
  const {
    sort,
    fields,
    defaultSort,
    aliasMap = {},
    tieBreaker = [],
  } = options;

  const parsed = parseSortSpec(sort, fields, defaultSort, aliasMap);
  const orderBy = parsed.flatMap(({ field, direction }) => {
    const column = fields[field];
    if (!column) return [];
    return [direction === "desc" ? desc(column as never) : asc(column as never)];
  });

  return [...orderBy, ...tieBreaker];
}

export function parseSortSpec<TField extends string>(
  sort: string | undefined,
  fields: Record<TField, unknown>,
  defaultSort: { field: TField; direction: SortDirection }[],
  aliasMap: Record<string, TField> = {},
): { field: TField; direction: SortDirection }[] {
  const normalized = sort?.trim();
  if (!normalized) return defaultSort;

  const parsedJson = tryParseJsonSort(normalized, fields, aliasMap);
  if (parsedJson.length > 0) return parsedJson;

  const parsedText = parseTextSort(normalized, fields, aliasMap);
  return parsedText.length > 0 ? parsedText : defaultSort;
}

function tryParseJsonSort<TField extends string>(
  input: string,
  fields: Record<TField, unknown>,
  aliasMap: Record<string, TField>,
): { field: TField; direction: SortDirection }[] {
  if (!input.startsWith("[")) return [];

  try {
    const value = JSON.parse(input);
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];

      const id =
        typeof (item as { id?: unknown }).id === "string"
          ? (item as { id: string }).id
          : null;
      if (!id) return [];

      const mappedField = mapSortField(id, fields, aliasMap);
      if (!mappedField) return [];

      return [
        {
          field: mappedField,
          direction: (item as { desc?: boolean }).desc === true ? "desc" : "asc",
        },
      ];
    });
  } catch {
    return [];
  }
}

function parseTextSort<TField extends string>(
  input: string,
  fields: Record<TField, unknown>,
  aliasMap: Record<string, TField>,
): { field: TField; direction: SortDirection }[] {
  return input
    .split(",")
    .map((token) => token.trim())
    .flatMap((token) => {
      if (!token) return [];

      let rawField = token;
      let direction: SortDirection = "asc";

      if (rawField.startsWith("-")) {
        rawField = rawField.slice(1);
        direction = "desc";
      } else if (rawField.includes(":")) {
        const [fieldPart, directionPart] = rawField.split(":");
        rawField = fieldPart?.trim() ?? "";
        direction = directionPart?.trim() === "desc" ? "desc" : "asc";
      }

      const mappedField = mapSortField(rawField, fields, aliasMap);
      return mappedField ? [{ field: mappedField, direction }] : [];
    });
}

function mapSortField<TField extends string>(
  field: string,
  fields: Record<TField, unknown>,
  aliasMap: Record<string, TField>,
): TField | null {
  if (field in fields) {
    return field as TField;
  }

  if (field in aliasMap) {
    return aliasMap[field] ?? null;
  }

  return null;
}
