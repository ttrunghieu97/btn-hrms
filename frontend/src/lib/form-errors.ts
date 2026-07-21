import { ApiError } from "@/lib/api-error";

export type FlatFieldErrors = Record<string, string>;

export function extractApiFieldErrors(error: unknown): FlatFieldErrors | null {
  if (!(error instanceof ApiError)) return null;

  // Case 1: NestJS/class-validator standard (fields: { name: ["error"] })
  if (error.details?.fields) {
    const nextErrors = Object.fromEntries(
      Object.entries(error.details.fields)
        .filter(([key, messages]) => key && Array.isArray(messages) && messages.length > 0)
        .map(([key, messages]) => [key, String(messages[0])]),
    );
    return Object.keys(nextErrors).length > 0 ? nextErrors : null;
  }

  // Case 2: Database constraint error (field: "name")
  if (error.details?.field && typeof error.details.field === "string" && error.message) {
    return { [error.details.field]: error.message };
  }

  return null;
}
