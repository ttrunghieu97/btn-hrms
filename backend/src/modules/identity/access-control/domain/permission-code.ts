export type PermissionScope = 'self' | 'department' | 'all' | 'sensitive';

export interface ParsedPermissionCode {
  domain: string;
  action: string;
  scope: PermissionScope | null;
}

const SCOPES = new Set<PermissionScope>(['self', 'department', 'all', 'sensitive']);

export function parsePermissionCode(code: string): ParsedPermissionCode {
  const parts = code.split(':');

  if (parts.length === 2 && parts[0] === 'sys' && parts[1] === 'all') {
    return { domain: 'sys', action: 'all', scope: null };
  }

  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new Error('Invalid permission code');
  }

  const domain = parts[0]!;
  const action = parts[1]!;
  const scope = parts[2]!;
  if (!SCOPES.has(scope as PermissionScope)) {
    throw new Error('Invalid permission scope');
  }

  return { domain, action, scope: scope as PermissionScope };
}
