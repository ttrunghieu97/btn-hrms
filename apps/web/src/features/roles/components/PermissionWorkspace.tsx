'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { commonUiCopy, roleUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

import { usePermissionCatalog } from '@/features/permissions';
import { useRoleQuery, useUpdateRoleMutation } from '../api/queries';
import { canEditRole } from '../role-access.utils';
import { setBreadcrumbRoleName } from '@/lib/breadcrumb-store';

import { PermissionMatrix } from './PermissionMatrix';
import { PermissionSidebar } from './PermissionSidebar';
import { ReviewChangesDialog } from './ReviewChangesDialog';
import type { RoleAssignmentMap } from '@/types/permission';
import { cn } from '@/lib/utils';

interface PermissionWorkspaceProps {
  id: string;
  variant?: 'full' | 'sheet';
}

export function PermissionWorkspace({ id, variant = 'full' }: PermissionWorkspaceProps) {
  const isSheet = variant === 'sheet';
  const router = useRouter();
  const { catalog, isLoading: isLoadingCatalog, permissionCodesToAssignments, assignmentsToPermissionCodes } = usePermissionCatalog();

  const { data: role, isLoading: isLoadingRole, isError: isErrorRole } = useRoleQuery(id);
  const updateMutation = useUpdateRoleMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignments, setAssignments] = useState<RoleAssignmentMap>({});

  // Filtering States
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);

  // Dialog controls
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const cannotEdit = Boolean(role && !canEditRole(role));
  const isPending = updateMutation.isPending;

  // Track initial state for dirty checks
  const [initialState, setInitialState] = useState({
    name: '',
    description: '',
    assignments: {} as RoleAssignmentMap,
  });

  useEffect(() => {
    if (!role) return;
    setName(role.name ?? '');
    setDescription(role.description ?? '');
    setBreadcrumbRoleName(role.name ?? '');

    const mappedAssignments = permissionCodesToAssignments(role.permissions || []);
    setAssignments(mappedAssignments);

    setInitialState({
      name: role.name ?? '',
      description: role.description ?? '',
      assignments: mappedAssignments,
    });

    // Reset filters
    setPermissionSearch('');
    setSelectedDomainId(null);
    setSelectedCategoryId(null);
    setShowOnlySelected(false);
    setActiveResourceId(null);
  }, [role]);

  // Check if form has unsaved changes
  const isDirty = useMemo(() => {
    if (name !== initialState.name) return true;
    if (description !== initialState.description) return true;

    const allKeys = new Set([
      ...Object.keys(assignments),
      ...Object.keys(initialState.assignments),
    ]);

    for (const key of allKeys) {
      const current = assignments[key];
      const initial = initialState.assignments[key];
      if (current?.selected !== initial?.selected || current?.scopeId !== initial?.scopeId) {
        return true;
      }
    }

    return false;
  }, [name, description, assignments, initialState]);

  const handleBack = () => {
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    router.push('/administration/roles');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(feedbackCopy.warning.roleNameRequired);
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      permissions: assignmentsToPermissionCodes(assignments),
    };

    try {
      await updateMutation.mutateAsync({ id, data: payload });
      toast.success(feedbackCopy.success.updated(feedbackEntity.role));
      setReviewDialogOpen(false);

      // Update initial state to reflect saved data (clearing isDirty)
      setInitialState({
        name: payload.name,
        description: payload.description,
        assignments: { ...assignments },
      });
    } catch {
      // Handled by query client
    }
  };

  const selectedCount = useMemo(() => {
    return Object.values(assignments).filter(a => a.selected).length;
  }, [assignments]);

  const changedCount = useMemo(() => {
    let count = 0;
    const allKeys = new Set([
      ...Object.keys(assignments),
      ...Object.keys(initialState.assignments),
    ]);

    for (const key of allKeys) {
      const current = assignments[key];
      const initial = initialState.assignments[key];
      if (current?.selected !== initial?.selected || current?.scopeId !== initial?.scopeId) {
        count++;
      }
    }
    return count;
  }, [assignments, initialState.assignments]);

  if (isLoadingRole || isLoadingCatalog) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[500px]">
        <Icons.spinner className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isErrorRole || !role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <Icons.info className="h-10 w-10 text-destructive mb-3" />
        <h3 className="text-lg font-bold text-foreground">{['Vai trò không tồn tại'].join('')}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          {['Không tìm thấy cấu hình vai trò yêu cầu hoặc bạn không có quyền truy cập.'].join('')}
        </p>
        <Button onClick={() => router.push('/administration/roles')} className="mt-4" size="sm">
          {['Quay lại danh sách'].join('')}
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-background">
      {/* ===== Main Body ===== */}
      <div className="flex-1 flex overflow-hidden min-w-0 bg-background">
        {/* Matrix Panel */}
        <div className="flex-1 flex flex-col min-w-0 p-5 pb-0">
          <PermissionMatrix
            catalog={catalog}
            assignments={assignments}
            onChange={setAssignments}
            cannotEdit={cannotEdit}
            search={permissionSearch}
            selectedDomainId={selectedDomainId}
            selectedCategoryId={selectedCategoryId}
            showOnlySelected={showOnlySelected}
            activeResourceId={isSheet ? null : activeResourceId}
            onSelectResource={isSheet ? () => {} : setActiveResourceId}
            initialAssignments={initialState.assignments}
          />
        </div>

        {/* Sidebar — right panel */}
        {!isSheet && (
          <div className="w-[320px] shrink-0 h-full p-5 pl-0 pb-0 overflow-y-auto">
            <PermissionSidebar
              catalog={catalog}
              assignments={assignments}
              onChange={setAssignments}
              activeResourceId={activeResourceId}
              cannotEdit={cannotEdit}
              changedCount={changedCount}
              selectedCount={selectedCount}
            />
          </div>
        )}
      </div>

      {!isSheet && (
        <>
          {/* ===== Sticky Bottom Action Bar ===== */}
          <div
            className={cn(
              "shrink-0 border-t bg-background/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-4 transition-all duration-200",
              isDirty ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <div className="flex items-center gap-3 text-sm">
              {changedCount > 0 && (
                <span className="font-semibold text-primary">
                  {changedCount} {['thay đổi'].join('')}
                </span>
              )}
              <span className={cn(
                "text-xs font-medium",
                isDirty ? "text-amber-600" : "text-muted-foreground"
              )}>
                {isDirty ? roleUiCopy.unsavedChanges : roleUiCopy.noUnsavedChanges}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isPending}
                className="h-9"
              >
                {commonUiCopy.cancel}
              </Button>
              {!cannotEdit && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setReviewDialogOpen(true)}
                    disabled={!name.trim() || isPending}
                    className="h-9 font-semibold"
                  >
                    <Icons.checks className="mr-1.5 h-4 w-4" />
                    {roleUiCopy.matrix.reviewChanges}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSave()}
                    isLoading={isPending}
                    disabled={!name.trim() || !isDirty}
                    className="h-9 font-semibold"
                  >
                    {commonUiCopy.saveChanges}
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Discard changes Alert Dialog */}
      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{roleUiCopy.discardTitle}</AlertDialogTitle>
            <AlertDialogDescription>{roleUiCopy.discardDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{roleUiCopy.continueEditing}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmDiscardOpen(false);
                router.push('/administration/roles');
              }}
            >
              {roleUiCopy.discard}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Changes & Confirm Save Dialog */}
      <ReviewChangesDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        catalog={catalog}
        initialAssignments={initialState.assignments}
        currentAssignments={assignments}
        onConfirm={() => void handleSave()}
        isSaving={isPending}
      />
    </div>
  );
}
