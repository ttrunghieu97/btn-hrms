'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/rbac';
import { can, type PermissionRule, ruleLabel } from '@/lib/permission-resolver';

interface PermissionGateProps {
  /** Simple permission string (single check) */
  permission?: string;
  /** Compound rule (anyOf / allOf / not) */
  rule?: PermissionRule;
  children: React.ReactNode;
  /** Redirect on deny — default true */
  redirectOnDeny?: boolean;
}

/**
 * Client-side permission gate.
 * Supports both single permission string and compound rules.
 *
 * Usage:
 *   <PermissionGate permission="employee:view">...</PermissionGate>
 *   <PermissionGate rule={{ anyOf: ['employee:view', 'employee:manage'] }}>...</PermissionGate>
 */
export default function PermissionGate({ permission, rule, children, redirectOnDeny = true }: PermissionGateProps) {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);

  const denied = permission
    ? !hasPermission(user, permission)
    : rule
      ? !can(user, rule)
      : false;

  const label = permission ?? (rule ? ruleLabel(rule) : '');

  useEffect(() => {
    if (!loading && initialized && denied && redirectOnDeny) {
      router.replace(`/unauthorized?missing=${encodeURIComponent(label)}`);
    }
  }, [denied, initialized, loading, label, router, redirectOnDeny]);

  if (!initialized || loading) return null;
  if (denied) return null;

  return <>{children}</>;
}
