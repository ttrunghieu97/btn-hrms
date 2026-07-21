export const DEFAULT_SCOPE_ID = "00000000-0000-0000-0000-000000000000";

export function getScopeId(): string {
  return process.env.TENANT_ID?.trim() || DEFAULT_SCOPE_ID;
}

// @deprecated aliases — kept for backward compat
/** @deprecated Use getScopeId */
export const getSingleTenantId = getScopeId;
export const DEFAULT_COMPANY_ID = DEFAULT_SCOPE_ID;
