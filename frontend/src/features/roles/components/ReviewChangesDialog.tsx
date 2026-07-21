'use client';

import React, { useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { roleUiCopy, commonUiCopy } from '@/lib/app-copy';
import type { PermissionCatalog, RoleAssignmentMap } from '@/types/permission';

interface ReviewChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: PermissionCatalog;
  initialAssignments: RoleAssignmentMap;
  currentAssignments: RoleAssignmentMap;
  onConfirm: () => void;
  isSaving: boolean;
}

interface ChangeItem {
  id: string;
  resourceName: string;
  actionId: string;
  type: 'added' | 'removed' | 'scope_changed';
  fromScope?: string;
  toScope?: string;
}

export function ReviewChangesDialog({
  open,
  onOpenChange,
  catalog,
  initialAssignments,
  currentAssignments,
  onConfirm,
  isSaving,
}: ReviewChangesDialogProps) {
  // Compute differences
  const changes = useMemo<ChangeItem[]>(() => {
    const list: ChangeItem[] = [];

    // Combine all permission IDs
    const allPermissionIds = new Set([
      ...Object.keys(initialAssignments),
      ...Object.keys(currentAssignments),
    ]);

    allPermissionIds.forEach(id => {
      const initial = initialAssignments[id];
      const current = currentAssignments[id];

      const initialSelected = initial?.selected || false;
      const currentSelected = current?.selected || false;

      // Find permission details in catalog
      const permission = catalog.permissions.find(p => p.id === id);
      const resource = permission
        ? catalog.resources.find(r => r.id === permission.resourceId)
        : null;

      const resourceName = resource?.name || permission?.resourceId || id.split(':')[0];
      const actionId = permission?.actionId || id.split(':')[1] || '';

      if (!initialSelected && currentSelected) {
        // Added
        list.push({
          id,
          resourceName,
          actionId,
          type: 'added',
          toScope: current.scopeId,
        });
      } else if (initialSelected && !currentSelected) {
        // Removed
        list.push({
          id,
          resourceName,
          actionId,
          type: 'removed',
        });
      } else if (initialSelected && currentSelected && initial.scopeId !== current.scopeId) {
        // Scope Changed
        list.push({
          id,
          resourceName,
          actionId,
          type: 'scope_changed',
          fromScope: initial.scopeId,
          toScope: current.scopeId,
        });
      }
    });

    // Sort changes: type first, then resource name
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.resourceName.localeCompare(b.resourceName);
    });
  }, [catalog, initialAssignments, currentAssignments]);

  const getScopeLabel = (scopeId?: string) => {
    if (!scopeId) return '';
    return catalog.scopes.find(s => s.id === scopeId)?.label || scopeId;
  };

  const hasChanges = changes.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col p-6">
        <AlertDialogHeader className="border-b pb-3 shrink-0">
          <AlertDialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Icons.info className="h-5 w-5 text-primary" />
            {roleUiCopy.matrix.changesTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {roleUiCopy.matrix.changesDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Change List Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[200px] scrollbar-thin">
          {!hasChanges ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
              <Icons.check className="h-8 w-8 text-green-500 mb-2" />
              {roleUiCopy.matrix.noChanges}
            </div>
          ) : (
            <div className="divide-y border rounded-xl overflow-hidden bg-card">
              {changes.map(change => (
                <div
                  key={change.id}
                  className="p-3 flex items-start justify-between text-sm transition-colors duration-150 hover:bg-muted/10"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground/90">{change.resourceName}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">{change.id}</span>
                    
                    {/* Scope diff description */}
                    {change.type === 'added' && (
                      <p className="text-xs text-green-600 font-medium">
                        {roleUiCopy.matrix.grantWithScope} <span className="font-bold">{getScopeLabel(change.toScope)}</span>
                      </p>
                    )}
                    {change.type === 'scope_changed' && (
                      <p className="text-xs text-amber-600 font-medium">
                        {roleUiCopy.matrix.scopeChanged} <span className="line-through text-muted-foreground">{getScopeLabel(change.fromScope)}</span>
                        <Icons.arrowRight className="inline h-3 w-3 mx-1 align-middle text-muted-foreground" />
                        <span className="font-bold">{getScopeLabel(change.toScope)}</span>
                      </p>
                    )}
                  </div>

                  {/* Badges for Change Type */}
                  <div className="shrink-0">
                    {change.type === 'added' && (
                      <Badge className="bg-green-100 hover:bg-green-100 text-green-800 font-semibold px-2 py-0.5 border border-green-200">
                        + {change.actionId.toUpperCase()}
                      </Badge>
                    )}
                    {change.type === 'removed' && (
                      <Badge variant="destructive" className="bg-red-100 hover:bg-red-100 text-red-800 font-semibold px-2 py-0.5 border border-red-200">
                        - {change.actionId.toUpperCase()}
                      </Badge>
                    )}
                    {change.type === 'scope_changed' && (
                      <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 border border-amber-200">
                        {roleUiCopy.matrix.scopeBadge}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <AlertDialogFooter className="border-t pt-3 shrink-0 flex items-center justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm" disabled={isSaving}>
              {commonUiCopy.cancel}
            </Button>
          </AlertDialogCancel>
          <Button
            size="sm"
            onClick={onConfirm}
            isLoading={isSaving}
          >
            {commonUiCopy.saveChanges}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
