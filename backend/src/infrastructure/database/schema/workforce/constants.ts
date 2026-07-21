/**
 * Identifier types for employee_identifiers table.
 * Stored as varchar, these constants ensure type-safe references.
 */
export const IdentifierTypes = {
  CITIZEN_ID: "citizen_id",
  PASSPORT: "passport",
  SOCIAL_INSURANCE: "social_insurance",
  TAX_CODE: "tax_code",
  DRIVER_LICENSE: "driver_license",
} as const;

export type IdentifierType =
  (typeof IdentifierTypes)[keyof typeof IdentifierTypes];
