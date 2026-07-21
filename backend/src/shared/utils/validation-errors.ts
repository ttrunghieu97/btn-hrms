export type ValidationErrorDetailMap = Record<string, string[]>;

type ClassValidatorError = {
  property?: string;
  constraints?: Record<string, string>;
  children?: ClassValidatorError[];
};

export function normalizeValidationErrors(
  errors: ClassValidatorError[] = [],
): ValidationErrorDetailMap {
  const result: ValidationErrorDetailMap = {};

  const normalizeSegment = (segment?: string) => {
    if (!segment) return "";
    return segment
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .filter(Boolean)
      .map((part) =>
        /^\d+$/.test(part)
          ? part
          : part.replace(/[_-]([a-z])/gi, (_, char: string) => char.toUpperCase()),
      )
      .join(".");
  };

  const walk = (items: ClassValidatorError[], parentPath?: string) => {
    for (const item of items) {
      const field = [parentPath, normalizeSegment(item.property)]
        .filter(Boolean)
        .join(".");
      const constraints = item.constraints
        ? Object.values(item.constraints)
        : [];
      if (field && constraints.length > 0) {
        if (!result[field]) result[field] = [];
        result[field].push(...constraints);
      }
      if (item.children && item.children.length > 0) {
        walk(item.children, field || parentPath);
      }
    }
  };

  walk(errors);
  return result;
}
