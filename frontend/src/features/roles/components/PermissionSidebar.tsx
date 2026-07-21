'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Icons } from '@/components/icons';
import { roleUiCopy } from '@/lib/app-copy';
import type { PermissionCatalog, RoleAssignmentMap } from '@/types/permission';

const CATEGORY_MAP = {
  Access: ['view', 'report', 'export', 'print', 'view:self', 'view:department', 'view:all'],
  Modify: ['create', 'edit', 'update', 'update:self', 'update:all', 'delete', 'copy', 'upload', 'edit:self', 'edit:department', 'edit:all'],
  Workflow: ['check', 'assign', 'approve', 'approve:department', 'submit', 'reject', 'lock', 'unlock'],
  Administration: ['manage', 'manage_periods', 'manage_payslips', 'reset-password', 'configure', 'sync', 'import', 'system', 'manage:sensitive', 'all']
} as const;

const CATEGORY_LABELS: [string, string][] = [
  ['Access', 'Truy cập'],
  ['Modify', 'Thay đổi'],
  ['Workflow', 'Quy trình'],
  ['Administration', 'Quản trị'],
];

interface PermissionSidebarProps {
  catalog: PermissionCatalog;
  assignments: RoleAssignmentMap;
  onChange: (value: RoleAssignmentMap) => void;
  activeResourceId: string | null;
  cannotEdit?: boolean;
  /** Changed count for display */
  changedCount?: number;
  /** Total selected count */
  selectedCount?: number;
}

export function PermissionSidebar({
  catalog,
  assignments,
  onChange,
  activeResourceId,
  cannotEdit = false,
  changedCount = 0,
  selectedCount = 0,
}: PermissionSidebarProps) {
  const resource = useMemo(() => {
    if (!activeResourceId) return null;
    return catalog.resources.find(r => r.id === activeResourceId) || null;
  }, [catalog.resources, activeResourceId]);

  const resourcePermissions = useMemo(() => {
    if (!activeResourceId) return [];
    return catalog.permissions.filter(p => p.resourceId === activeResourceId);
  }, [catalog.permissions, activeResourceId]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, typeof resourcePermissions> = { Access: [], Modify: [], Workflow: [], Administration: [] };
    resourcePermissions.forEach(p => {
      let category = 'Administration';
      for (const [cat, actions] of Object.entries(CATEGORY_MAP)) {
        if ((actions as readonly string[]).includes(p.actionId)) { category = cat; break; }
      }
      groups[category].push(p);
    });
    return Object.entries(groups).filter(([_, perms]) => perms.length > 0);
  }, [resourcePermissions]);

  // Category breakdown for summary view
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = { Access: 0, Modify: 0, Workflow: 0, Administration: 0 };
    Object.entries(assignments).forEach(([id, a]) => {
      if (!a.selected) return;
      const perm = catalog.permissions.find(p => p.id === id);
      if (!perm) return;
      let cat = 'Administration';
      for (const [c, actions] of Object.entries(CATEGORY_MAP)) {
        if ((actions as readonly string[]).includes(perm.actionId)) { cat = c; break; }
      }
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [assignments, catalog.permissions]);

  const criticalCount = useMemo(() => {
    return Object.entries(assignments).filter(([id, a]) => a.selected && catalog.permissions.find(p => p.id === id)?.critical).length;
  }, [assignments, catalog.permissions]);

  // Generate endpoints suggestion from resource ID
  const resourceEndpoints = useMemo(() => {
    if (!activeResourceId) return [];
    const id = activeResourceId;
    return [
      `GET /api/${id}`,
      `POST /api/${id}`,
      `PUT /api/${id}/{id}`,
      `DELETE /api/${id}/{id}`,
    ];
  }, [activeResourceId]);

  const handleToggleCell = (permissionId: string, checked: boolean) => {
    if (cannotEdit) return;
    const newAssignments = { ...assignments };
    const toggleRecursive = (id: string, select: boolean) => {
      newAssignments[id] = { selected: select, scopeId: assignments[id]?.scopeId || 'all' };
      if (select) {
        const meta = catalog.permissions.find(p => p.id === id);
        if (meta?.dependsOn) meta.dependsOn.forEach(depId => { if (!newAssignments[depId]?.selected) toggleRecursive(depId, true); });
      } else {
        catalog.permissions.forEach(p => { if (p.dependsOn?.includes(id) && newAssignments[p.id]?.selected) toggleRecursive(p.id, false); });
      }
    };
    toggleRecursive(permissionId, checked);
    onChange(newAssignments);
  };

  const handleScopeChange = (permissionId: string, scopeId: string) => {
    if (cannotEdit) return;
    const newAssignments = { ...assignments };
    newAssignments[permissionId] = { selected: newAssignments[permissionId]?.selected || false, scopeId };
    onChange(newAssignments);
  };

  // Empty state → summary panel
  if (!resource) {
    const totalPerms = catalog.permissions.length;
    return (
      <div className="flex flex-col h-full border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="sticky top-0 z-10 p-4 border-b bg-muted/20">
          <h3 className="font-semibold text-sm text-foreground/80 flex items-center gap-2">
            <Icons.info className="h-4 w-4 text-primary" />
            {['Tổng quan phân quyền'].join('')}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/10 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{selectedCount}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{['Đã cấp'].join('')}</p>
            </div>
            <div className="rounded-lg border bg-muted/10 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{changedCount}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{['Thay đổi'].join('')}</p>
            </div>
          </div>

          {criticalCount > 0 && (
            <div className="rounded-lg border border-red-200/50 bg-red-50/20 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-700 uppercase tracking-wide">
                <Icons.warning className="h-3.5 w-3.5" />
                {criticalCount} {['quyền nhạy cảm'].join('')}
              </div>
              <p className="text-[10px] text-red-600/80 mt-1">
                {['Các quyền này có thể ảnh hưởng đến bảo mật hệ thống.'].join('')}
              </p>
            </div>
          )}

          {/* Permission Coverage with progress bars */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{['Phân bố quyền'].join('')}</p>
            {CATEGORY_LABELS.filter(([cat]) => categoryBreakdown[cat] > 0 || totalPerms > 0).map(([cat, label]) => {
              const count = categoryBreakdown[cat] || 0;
              const pct = totalPerms > 0 ? Math.round((count / Object.values(CATEGORY_MAP).flat().length) * 100) : 0;
              const maxInCategory = Object.values(CATEGORY_MAP).flat().length;
              const barPct = Math.min(100, Math.round((count / Math.max(1, maxInCategory)) * 100));
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className="font-semibold text-foreground/80">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        barPct > 60 ? "bg-primary" : barPct > 20 ? "bg-primary/70" : "bg-muted-foreground/30"
                      )}
                      style={{ width: `${Math.max(4, barPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
            {['Chọn một tài nguyên để xem chi tiết'].join('')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border rounded-xl bg-card overflow-hidden shadow-sm">
      {/* Sidebar Header (sticky) */}
      <div className="sticky top-0 z-10 p-4 border-b bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            {resource.icon === 'Users' && <Icons.people className="h-4 w-4" />}
            {resource.icon === 'Calendar' && <Icons.calendar className="h-4 w-4" />}
            {resource.icon === 'CreditCard' && <Icons.billing className="h-4 w-4" />}
            {resource.icon === 'Settings' && <Icons.settings className="h-4 w-4" />}
            {!['Users', 'Calendar', 'CreditCard', 'Settings'].includes(resource.icon || '') && (
              <Icons.page className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-foreground/90 truncate">{resource.name}</h3>
            <p className="text-[10px] text-muted-foreground font-mono truncate">{resource.id}</p>
          </div>
        </div>
      </div>

      {/* Sidebar Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Permissions section */}
        <div className="p-4 space-y-4">
          {groupedPermissions.map(([category, perms]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 flex items-center justify-between">
                <span>
                  {category === 'Access' && roleUiCopy.matrix.categoryAccess}
                  {category === 'Modify' && roleUiCopy.matrix.categoryModify}
                  {category === 'Workflow' && roleUiCopy.matrix.categoryWorkflow}
                  {category === 'Administration' && roleUiCopy.matrix.categoryAdministration}
                </span>
                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono">{perms.length}</span>
              </h4>

              <div className="space-y-2">
                {perms.map(permission => {
                  const assignment = assignments[permission.id];
                  const isChecked = assignment?.selected || false;

                  return (
                    <div
                      key={permission.id}
                      className={cn(
                        "rounded-lg border transition-all duration-200",
                        isChecked
                          ? "bg-primary/[0.02] border-primary/20"
                          : "bg-card border-border/60 hover:bg-muted/10"
                      )}
                    >
                      {/* Compact permission row */}
                      <div className="flex items-start gap-2.5 p-2.5">
                        <Checkbox
                          id={`sidebar-chk-${permission.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleToggleCell(permission.id, checked === true)}
                          disabled={cannotEdit}
                          className="size-5 mt-0.5"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <Label
                              htmlFor={`sidebar-chk-${permission.id}`}
                              className={cn("text-xs font-bold cursor-pointer transition-colors", isChecked ? "text-foreground" : "text-muted-foreground/80")}
                            >
                              {permission.actionId.toUpperCase()}
                            </Label>
                            {permission.critical ? (
                              <Badge variant="destructive" className="text-[8px] px-1 py-0 font-bold uppercase tracking-wide">{roleUiCopy.matrix.criticalBadge.toUpperCase()}</Badge>
                            ) : isChecked ? (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 font-bold uppercase text-green-600 border-green-200 bg-green-50/20 tracking-wide">{roleUiCopy.matrix.safeBadge.toUpperCase()}</Badge>
                            ) : null}
                          </div>
                          <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                            {permission.description || '—'}
                          </p>

                          {/* Dependencies */}
                          {isChecked && permission.dependsOn && permission.dependsOn.length > 0 && (
                            <div className="flex items-start gap-1 pt-0.5">
                              <span className="text-[8px] font-bold uppercase text-muted-foreground/60 tracking-wider shrink-0">Yêu cầu:</span>
                              <div className="flex flex-wrap gap-0.5">
                                {permission.dependsOn.map(dep => (
                                  <code key={dep} className="px-1 py-0.5 rounded bg-muted/60 text-[8px] font-mono text-muted-foreground">{dep}</code>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Affected screens */}
                          {isChecked && permission.affectedScreens && permission.affectedScreens.length > 0 && (
                            <div className="flex items-start gap-1">
                              <span className="text-[8px] font-bold uppercase text-muted-foreground/60 tracking-wider shrink-0">Màn hình:</span>
                              <span className="text-[9px] text-muted-foreground">{permission.affectedScreens.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scope — per-resource, at bottom of last permission card */}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Scope section (per-resource, consolidated) */}
        {resource.supportsScope && (
          <div className="border-t bg-muted/20 p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {roleUiCopy.matrix.scopeTitle}
            </h4>
            <RadioGroup
              value={
                // Find first checked permission's scope as representative
                resourcePermissions.map(p => assignments[p.id]?.scopeId).find(s => s) || 'all'
              }
              onValueChange={(val) => {
                if (cannotEdit) return;
                const newAssignments = { ...assignments };
                resourcePermissions.forEach(p => {
                  if (newAssignments[p.id]?.selected) {
                    newAssignments[p.id] = { selected: true, scopeId: val };
                  }
                });
                onChange(newAssignments);
              }}
              disabled={cannotEdit}
              className="flex flex-wrap gap-x-4 gap-y-2"
            >
              {catalog.scopes.map(scope => (
                <div key={scope.id} className="flex items-center gap-1.5">
                  <RadioGroupItem id={`sidebar-scope-${resource.id}-${scope.id}`} value={scope.id} className="scale-90" disabled={cannotEdit} />
                  <Label htmlFor={`sidebar-scope-${resource.id}-${scope.id}`} className="text-xs cursor-pointer font-semibold text-muted-foreground/80">{scope.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Endpoints section */}
        <div className="border-t p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Icons.code className="h-3 w-3" />
            {['Endpoints'].join('')}
          </h4>
          <div className="space-y-1">
            {resourceEndpoints.map(endpoint => (
              <code key={endpoint} className="block px-2 py-1 rounded bg-muted/40 text-[9px] font-mono text-muted-foreground/80">{endpoint}</code>
            ))}
          </div>
        </div>

        {/* Used by section */}
        <div className="border-t p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Icons.people className="h-3 w-3" />
            {['Ảnh hưởng'].join('')}
          </h4>
          <p className="text-[10px] text-muted-foreground">
            {['Resource này có', String(resourcePermissions.length), 'quyền, hiện đã cấp', String(resourcePermissions.filter(p => assignments[p.id]?.selected).length)].join(' ')}.
          </p>
        </div>
      </div>
    </div>
  );
}
