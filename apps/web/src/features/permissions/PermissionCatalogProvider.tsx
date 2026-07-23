'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { permissionsControllerFindAll } from '@/api/generated/endpoints';
import { extractList } from '@/lib/api-extract';
import { roleUiCopy } from '@/lib/app-copy';
import type {
  PermissionCatalog,
  DomainMetadata,
  ResourceMetadata,
  PermissionMetadata,
  ScopeOption,
  PermissionTemplate,
  RoleAssignmentMap,
} from '@/types/permission';

interface PermissionCatalogContextProps {
  catalog: PermissionCatalog;
  isLoading: boolean;
  isError: boolean;
  permissionCodesToAssignments: (codes: string[]) => RoleAssignmentMap;
  assignmentsToPermissionCodes: (assignments: RoleAssignmentMap) => string[];
}

const PermissionCatalogContext = createContext<PermissionCatalogContextProps | undefined>(undefined);

// Non-hardcoded raw metadata templates (without localized UI strings)
const DOMAINS_RAW = [
  { id: 'people', icon: 'Users', color: 'blue', order: 1 },
  { id: 'attendance', icon: 'Calendar', color: 'green', order: 2 },
  { id: 'payroll', icon: 'CreditCard', color: 'purple', order: 3 },
  { id: 'settings', icon: 'Settings', color: 'orange', order: 4 },
];

const RESOURCES_RAW = [
  { id: 'dashboard', domainId: 'people', order: 1, supportsScope: false },
  { id: 'employees', domainId: 'people', order: 2, supportsScope: true, supportsBulk: true, supportsImport: true },
  { id: 'attendance', domainId: 'attendance', order: 1, supportsScope: true },
  { id: 'schedule', domainId: 'attendance', order: 2, supportsScope: true },
  { id: 'tasks', domainId: 'attendance', order: 3, supportsScope: true },
  { id: 'payroll', domainId: 'payroll', order: 1, supportsScope: true },
  { id: 'leave', domainId: 'payroll', order: 2, supportsScope: true },
  { id: 'leave-balance', domainId: 'payroll', order: 3, supportsScope: false },
  { id: 'users', domainId: 'settings', order: 1, supportsScope: false },
  { id: 'departments', domainId: 'settings', order: 2, supportsScope: false },
  { id: 'audit-logs', domainId: 'settings', order: 3, supportsScope: false },
  { id: 'files', domainId: 'settings', order: 4, supportsScope: false },
];

const SCOPES_RAW = [
  { id: 'all' },
  { id: 'department' },
  { id: 'team' },
  { id: 'self' },
];

interface DBMapping {
  code: string;
  permissionId: string;
  scopeId: string;
}

const MAPPINGS: DBMapping[] = [
  { code: 'sys:all', permissionId: 'sys:all', scopeId: 'all' },
  { code: 'dashboard:view', permissionId: 'dashboard:view', scopeId: 'all' },
  { code: 'users:view', permissionId: 'users:view', scopeId: 'all' },
  { code: 'users:create', permissionId: 'users:create', scopeId: 'all' },
  { code: 'users:edit', permissionId: 'users:edit', scopeId: 'all' },
  { code: 'users:delete', permissionId: 'users:delete', scopeId: 'all' },
  { code: 'departments:view', permissionId: 'departments:view', scopeId: 'all' },
  { code: 'departments:create', permissionId: 'departments:create', scopeId: 'all' },
  { code: 'departments:edit', permissionId: 'departments:edit', scopeId: 'all' },
  { code: 'departments:delete', permissionId: 'departments:delete', scopeId: 'all' },
  { code: 'employees:view:self', permissionId: 'employees:view', scopeId: 'self' },
  { code: 'employees:view:department', permissionId: 'employees:view', scopeId: 'department' },
  { code: 'employees:view:all', permissionId: 'employees:view', scopeId: 'all' },
  { code: 'employees:create', permissionId: 'employees:create', scopeId: 'all' },
  { code: 'employees:edit', permissionId: 'employees:edit', scopeId: 'all' },
  { code: 'employees:update:self', permissionId: 'employees:update', scopeId: 'self' },
  { code: 'employees:update:all', permissionId: 'employees:update', scopeId: 'all' },
  { code: 'employees:manage:sensitive', permissionId: 'employees:manage:sensitive', scopeId: 'all' },
  { code: 'employees:reset-password', permissionId: 'employees:reset-password', scopeId: 'all' },
  { code: 'employees:delete', permissionId: 'employees:delete', scopeId: 'all' },
  { code: 'schedule:view:self', permissionId: 'schedule:view', scopeId: 'self' },
  { code: 'schedule:view:department', permissionId: 'schedule:view', scopeId: 'department' },
  { code: 'schedule:view:all', permissionId: 'schedule:view', scopeId: 'all' },
  { code: 'schedule:edit:self', permissionId: 'schedule:edit', scopeId: 'self' },
  { code: 'schedule:edit:department', permissionId: 'schedule:edit', scopeId: 'department' },
  { code: 'schedule:edit:all', permissionId: 'schedule:edit', scopeId: 'all' },
  { code: 'schedule:create', permissionId: 'schedule:create', scopeId: 'all' },
  { code: 'schedule:delete', permissionId: 'schedule:delete', scopeId: 'all' },
  { code: 'schedule:copy', permissionId: 'schedule:copy', scopeId: 'all' },
  { code: 'attendance:check', permissionId: 'attendance:check', scopeId: 'all' },
  { code: 'attendance:view:self', permissionId: 'attendance:view', scopeId: 'self' },
  { code: 'attendance:view:department', permissionId: 'attendance:view', scopeId: 'department' },
  { code: 'attendance:view:all', permissionId: 'attendance:view', scopeId: 'all' },
  { code: 'attendance:report', permissionId: 'attendance:report', scopeId: 'all' },
  { code: 'tasks:view:self', permissionId: 'tasks:view', scopeId: 'self' },
  { code: 'tasks:view', permissionId: 'tasks:view', scopeId: 'all' },
  { code: 'tasks:create', permissionId: 'tasks:create', scopeId: 'all' },
  { code: 'tasks:edit', permissionId: 'tasks:edit', scopeId: 'all' },
  { code: 'tasks:delete', permissionId: 'tasks:delete', scopeId: 'all' },
  { code: 'tasks:assign', permissionId: 'tasks:assign', scopeId: 'all' },
  { code: 'files:upload', permissionId: 'files:upload', scopeId: 'all' },
  { code: 'payroll:view:self', permissionId: 'payroll:view', scopeId: 'self' },
  { code: 'payroll:view:all', permissionId: 'payroll:view', scopeId: 'all' },
  { code: 'payroll:view', permissionId: 'payroll:view', scopeId: 'all' },
  { code: 'payroll:edit', permissionId: 'payroll:edit', scopeId: 'all' },
  { code: 'payroll:manage_periods', permissionId: 'payroll:manage_periods', scopeId: 'all' },
  { code: 'payroll:manage_payslips', permissionId: 'payroll:manage_payslips', scopeId: 'all' },
  { code: 'leave:view:self', permissionId: 'leave:view', scopeId: 'self' },
  { code: 'leave:view:department', permissionId: 'leave:view', scopeId: 'department' },
  { code: 'leave:view:all', permissionId: 'leave:view', scopeId: 'all' },
  { code: 'leave:create', permissionId: 'leave:create', scopeId: 'all' },
  { code: 'leave:edit', permissionId: 'leave:edit', scopeId: 'all' },
  { code: 'leave:approve:department', permissionId: 'leave:approve', scopeId: 'department' },
  { code: 'leave:approve', permissionId: 'leave:approve', scopeId: 'all' },
  { code: 'leave-balance:view', permissionId: 'leave-balance:view', scopeId: 'all' },
  { code: 'audit-logs:view', permissionId: 'audit-logs:view', scopeId: 'all' },
  { code: 'notifications:view:self', permissionId: 'notifications:view', scopeId: 'self' },
];

const TEMPLATES_RAW = [
  {
    id: 'employee_base',
    assignments: {
      'dashboard:view': { selected: true, scopeId: 'all' },
      'employees:view': { selected: true, scopeId: 'self' },
      'employees:update': { selected: true, scopeId: 'self' },
      'schedule:view': { selected: true, scopeId: 'self' },
      'attendance:view': { selected: true, scopeId: 'self' },
      'attendance:check': { selected: true, scopeId: 'all' },
      'tasks:view': { selected: true, scopeId: 'self' },
      'payroll:view': { selected: true, scopeId: 'self' },
      'leave:view': { selected: true, scopeId: 'self' },
      'leave:create': { selected: true, scopeId: 'all' },
      'leave:edit': { selected: true, scopeId: 'all' },
      'leave-balance:view': { selected: true, scopeId: 'all' },
    },
  },
  {
    id: 'hr_manager',
    assignments: {
      'dashboard:view': { selected: true, scopeId: 'all' },
      'employees:view': { selected: true, scopeId: 'all' },
      'employees:create': { selected: true, scopeId: 'all' },
      'employees:edit': { selected: true, scopeId: 'all' },
      'employees:update': { selected: true, scopeId: 'all' },
      'employees:manage:sensitive': { selected: true, scopeId: 'all' },
      'employees:reset-password': { selected: true, scopeId: 'all' },
      'employees:delete': { selected: true, scopeId: 'all' },
      'schedule:view': { selected: true, scopeId: 'all' },
      'schedule:edit': { selected: true, scopeId: 'all' },
      'schedule:create': { selected: true, scopeId: 'all' },
      'schedule:delete': { selected: true, scopeId: 'all' },
      'schedule:copy': { selected: true, scopeId: 'all' },
      'attendance:view': { selected: true, scopeId: 'all' },
      'attendance:report': { selected: true, scopeId: 'all' },
      'leave:view': { selected: true, scopeId: 'all' },
      'leave:create': { selected: true, scopeId: 'all' },
      'leave:edit': { selected: true, scopeId: 'all' },
      'leave:approve': { selected: true, scopeId: 'all' },
      'leave-balance:view': { selected: true, scopeId: 'all' },
    },
  },
  {
    id: 'payroll_manager',
    assignments: {
      'dashboard:view': { selected: true, scopeId: 'all' },
      'payroll:view': { selected: true, scopeId: 'all' },
      'payroll:edit': { selected: true, scopeId: 'all' },
      'payroll:manage_periods': { selected: true, scopeId: 'all' },
      'payroll:manage_payslips': { selected: true, scopeId: 'all' },
    },
  },
];

export function PermissionCatalogProvider({ children }: { children: React.ReactNode }) {
  const { data: dbPermissionsRaw, isLoading, isError } = useQuery({
    queryKey: ['permissions', 'list-raw'],
    queryFn: () => permissionsControllerFindAll(),
    select: (data) => extractList<{ code: string; description?: string }>(data),
  });

  const catalog = useMemo<PermissionCatalog>(() => {
    const dbPermissions = dbPermissionsRaw || [];

    // Localized Domains mapping
    const domains: DomainMetadata[] = DOMAINS_RAW.map(d => ({
      ...d,
      name: roleUiCopy.matrix.catalog.domains[d.id as keyof typeof roleUiCopy.matrix.catalog.domains] || d.id,
    }));

    // Localized Resources mapping
    const resources: ResourceMetadata[] = RESOURCES_RAW.map(r => ({
      ...r,
      name: roleUiCopy.matrix.catalog.resources[r.id as keyof typeof roleUiCopy.matrix.catalog.resources] || r.id,
    }));

    // Localized Scopes mapping
    const scopes: ScopeOption[] = SCOPES_RAW.map(s => ({
      ...s,
      label: roleUiCopy.matrix.catalog.scopes[s.id as keyof typeof roleUiCopy.matrix.catalog.scopes] || s.id,
    }));

    // Localized Templates mapping
    const templates: PermissionTemplate[] = TEMPLATES_RAW.map(t => {
      const templateCopyKey = t.id === 'employee_base' ? 'employeeBase' : t.id === 'hr_manager' ? 'hrManager' : 'payrollManager';
      const meta = roleUiCopy.matrix.catalog.templates[templateCopyKey];
      return {
        id: t.id,
        name: meta?.name || t.id,
        description: meta?.description,
        assignments: t.assignments as unknown as Record<string, { selected: boolean; scopeId?: string }>,
      };
    });

    const permissionMetadataList: PermissionMetadata[] = [];

    dbPermissions.forEach((p) => {
      const mapping = MAPPINGS.find((m) => m.code === p.code);
      if (mapping) {
        const exists = permissionMetadataList.some((metadata) => metadata.id === mapping.permissionId);
        if (!exists) {
          const parts = mapping.permissionId.split(':');
          const resourceId = parts[0];
          const actionId = parts[1];

          const dependsOn: string[] = [];
          if (actionId === 'create' || actionId === 'edit' || actionId === 'delete' || actionId === 'update' || actionId === 'report' || actionId === 'approve') {
            dependsOn.push(`${resourceId}:view`);
          }

          permissionMetadataList.push({
            id: mapping.permissionId,
            resourceId,
            actionId,
            description: p.description || `Quyền ${mapping.permissionId}`,
            critical: actionId === 'delete' || mapping.permissionId.includes('sensitive') || mapping.permissionId.includes('payroll:edit'),
            dependsOn,
            affectedScreens: [resourceId.charAt(0).toUpperCase() + resourceId.slice(1)],
          });
        }
      } else {
        const parts = p.code.split(':');
        const resourceId = parts[0] || 'sys';
        const actionId = parts[1] || 'all';

        const dependsOn: string[] = [];
        if (actionId === 'create' || actionId === 'edit' || actionId === 'delete' || actionId === 'update') {
          dependsOn.push(`${resourceId}:view`);
        }

        permissionMetadataList.push({
          id: p.code,
          resourceId,
          actionId,
          description: p.description || `Quyền ${p.code}`,
          critical: actionId === 'delete',
          dependsOn,
          affectedScreens: [resourceId],
        });
      }
    });

    permissionMetadataList.sort((a, b) => a.id.localeCompare(b.id));

    return {
      domains,
      resources,
      permissions: permissionMetadataList,
      scopes,
      templates,
    };
  }, [dbPermissionsRaw]);

  const permissionCodesToAssignments = (codes: string[]): RoleAssignmentMap => {
    const assignments: RoleAssignmentMap = {};

    catalog.permissions.forEach((permission) => {
      const matches = MAPPINGS.filter((m) => m.permissionId === permission.id);

      let selected = false;
      let scopeId = 'all';

      for (const match of matches) {
        if (codes.includes(match.code)) {
          selected = true;
          scopeId = match.scopeId;
        }
      }

      if (!selected && codes.includes(permission.id)) {
        selected = true;
        scopeId = 'all';
      }

      assignments[permission.id] = { selected, scopeId };
    });

    return assignments;
  };

  const assignmentsToPermissionCodes = (assignments: RoleAssignmentMap): string[] => {
    const codesSet = new Set<string>();

    Object.entries(assignments).forEach(([permissionId, assignment]) => {
      if (!assignment.selected) return;

      const matches = MAPPINGS.filter((m) => m.permissionId === permissionId);
      if (matches.length > 0) {
        const exactMatch = matches.find((m) => m.scopeId === assignment.scopeId);
        if (exactMatch) {
          codesSet.add(exactMatch.code);
        } else {
          const fallback = matches.find((m) => m.scopeId === 'all') || matches[0];
          codesSet.add(fallback.code);
        }
      } else {
        codesSet.add(permissionId);
      }
    });

    return Array.from(codesSet);
  };

  const contextValue = useMemo(() => ({
    catalog,
    isLoading,
    isError,
    permissionCodesToAssignments,
    assignmentsToPermissionCodes,
  }), [catalog, isLoading, isError]);

  return (
    <PermissionCatalogContext.Provider value={contextValue}>
      {children}
    </PermissionCatalogContext.Provider>
  );
}

export function usePermissionCatalog() {
  const context = useContext(PermissionCatalogContext);
  if (!context) {
    throw new Error('usePermissionCatalog must be used within a PermissionCatalogProvider');
  }
  return context;
}
