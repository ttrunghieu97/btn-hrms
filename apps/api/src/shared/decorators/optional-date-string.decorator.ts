import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsDateString, IsOptional } from "class-validator";

function normalizeOptionalDateInput(value: unknown) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (
    trimmed === "" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return undefined;
  }

  return trimmed;
}

export function IsOptionalDateString() {
  return applyDecorators(
    Transform(({ value }) => normalizeOptionalDateInput(value)),
    IsOptional(),
    IsDateString(),
  );
}

