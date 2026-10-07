export function canEditRole(role?: { type?: string; isSystem?: boolean; code?: string } | null) {
  if (!role) return true;
  return role.code !== 'system_admin';
}

export function requiresExceptionGrantFields() {
  return ['reason', 'expiresAt'] as const;
}
