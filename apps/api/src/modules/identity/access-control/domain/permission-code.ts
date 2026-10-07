export type PermissionScope = 'self' | 'department' | 'all' | 'sensitive';

export interface ParsedPermissionCode {
  domain: string;
  action: string;
  scope: PermissionScope | null;
}

const SCOPES = new Set<PermissionScope>(['self', 'department', 'all', 'sensitive']);

export function parsePermissionCode(code: string): ParsedPermissionCode {
  const parts = code.split(':');

  if (parts.length < 2 || parts.some((part) => part.length === 0)) {
    throw new Error('Invalid permission code');
  }

  const domain = parts[0]!;
  const action = parts[1]!;
  const scope = parts.length >= 3 && parts[2]!.length > 0 ? (parts[2]! as PermissionScope) : null;

  // Only validate scope when present — many codes (employee:view, profile:view) are 2-part
  if (scope && !SCOPES.has(scope)) {
    throw new Error('Invalid permission scope');
  }

  return { domain, action, scope };
}
