"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { userInvalidations, userKeys } from "../api/queries";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-error";
import { commonUiCopy, userUiCopy } from "@/lib/app-copy";
import { feedbackCopy, feedbackEntity } from "@/lib/feedback-copy";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "../api/types";
import { updateAccessControlMutation } from "../api/mutations";
import { rolesQueryOptions, type Role } from "@/features/roles";
import { usePermissionsQuery } from "@/features/permissions";
import { useMyUserProfileQuery } from "@/features/profile";

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  module?: string;
}

interface UserRolesSheetProps {
  user?: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function groupPermissions(permissions: PermissionItem[]) {
  const groups: Record<string, PermissionItem[]> = {};

  permissions.forEach((perm) => {
    const code = perm.code || perm.name || perm;
    let moduleName: string = userUiCopy.otherModule;

    if (typeof code === "string") {
      if (code.includes(":")) moduleName = code.split(":")[0];
      else if (code.includes(".")) moduleName = code.split(".")[0];
      else if (code.includes("_")) moduleName = code.split("_")[0];
      else {
        const matches = code.match(/[A-Z][a-z]+/g);
        if (matches && matches.length > 0) {
          moduleName = matches[matches.length - 1];
        }
      }
    }

    const formattedModule =
      moduleName.charAt(0).toUpperCase() + moduleName.slice(1).toLowerCase();

    if (!groups[formattedModule]) groups[formattedModule] = [];
    groups[formattedModule].push(perm);
  });

  return groups;
}

export function UserRolesSheet({ user, open, onOpenChange }: UserRolesSheetProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSuperAdminVal, setIsSuperAdminVal] = useState<boolean>(false);

  const { data: currentUser } = useMyUserProfileQuery();
  const { data: permissionsData, isLoading: isLoadingPermissions } = usePermissionsQuery(open);

  const { data: rolesList = [], isLoading: isLoadingRoles } = useQuery({
    ...rolesQueryOptions,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setSelectedPermissions(Array.isArray(user?.permissions) ? user.permissions : []);
      setSelectedRoles(Array.isArray(user?.roleIds) ? user.roleIds : []);
      setIsSuperAdminVal(user?.isSuperAdmin ?? false);
    }
  }, [user, open]);

  const updateMutation = useMutation({
    ...updateAccessControlMutation,
    onSuccess: () => {
      toast.success(feedbackCopy.success.updated(feedbackEntity.userPermissions));
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof Error && (error.message === "Forbidden" || (error as any).status === 403)) {
        toast.error(feedbackCopy.warning.accessDenied("thay doi phan quyen"));
        if (error instanceof ApiError) error.toastShown = true;
      }
    },
  });

  const handleTogglePermission = (permCode: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permCode) ? prev.filter((p) => p !== permCode) : [...prev, permCode],
    );
  };

  const handleToggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId],
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      await updateMutation.mutateAsync({
        userId: user.id,
        roleIds: selectedRoles,
        permissionCodes: selectedPermissions,
        isSuperAdmin: isSuperAdminVal,
      });
    } catch {
      // onError handles toast
    }
  };

  const groupedPermissions = useMemo(
    () => permissionsData?.groupedPermissions ?? groupPermissions(permissionsData?.permissions ?? []),
    [permissionsData],
  );

  const rolePermissions = useMemo(() => {
    const perms = new Set<string>();
    selectedRoles.forEach((roleId) => {
      const role = rolesList.find((r: Role) => r.id === roleId);
      if (role?.permissions) {
        role.permissions.forEach((p: string) => perms.add(p));
      }
    });
    return perms;
  }, [selectedRoles, rolesList]);

  const isPending = updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] p-0 flex flex-col h-full overflow-hidden border-l">
        <div className="px-6 py-6 border-b bg-muted/30">
          <SheetHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-bold">
                {userUiCopy.rolesSheetTitle(user?.username)}
              </SheetTitle>
              <SheetDescription>
                {userUiCopy.rolesSheetDescription}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                {commonUiCopy.cancel}
              </Button>
              {(!user?.isSuperAdmin || currentUser?.isSuperAdmin) && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Icons.spinner className="mr-2 size-4 animate-spin" /> {commonUiCopy.saving}
                    </>
                  ) : (
                    userUiCopy.savePermissions
                  )}
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-32">
          {currentUser?.isSuperAdmin && (
            <div className="p-4 rounded-xl border bg-card flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Icons.shield className="size-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">{userUiCopy.promoteAdminTitle}</h3>
                  <p className="text-xs text-muted-foreground">
                    {userUiCopy.promoteAdminDescription}
                  </p>
                </div>
              </div>
              <Checkbox
                checked={isSuperAdminVal}
                onCheckedChange={(checked) => setIsSuperAdminVal(!!checked)}
              />
            </div>
          )}

          {isSuperAdminVal ? (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <Icons.shield className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-900">{userUiCopy.systemAdminTitle}</h3>
                <p className="text-sm text-emerald-800/80">
                  {userUiCopy.systemAdminDescription}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icons.people className="size-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{userUiCopy.roleGroupsTitle}</h3>
                    <p className="text-xs text-muted-foreground">
                      {userUiCopy.roleGroupsDescription}
                    </p>
                  </div>
                </div>

                {isLoadingRoles ? (
                  <div className="flex justify-center p-4">
                    <Icons.spinner className="animate-spin size-5 text-muted-foreground" />
                  </div>
                ) : rolesList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rolesList.map((role: Role) => (
                      <label
                        key={role.id}
                        className={`
                          flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:bg-muted/50
                          ${selectedRoles.includes(role.id) ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"}
                        `}
                      >
                        <Checkbox
                          checked={selectedRoles.includes(role.id)}
                          onCheckedChange={() => handleToggleRole(role.id)}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{role.name}</p>
                          {role.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-8">
                    <AppEmptyState
                      icon={<Icons.shield className="size-8" />}
                      title={userUiCopy.noRoleGroups}
                      compact
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icons.shield className="size-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{userUiCopy.specialPermissionsTitle}</h3>
                    <p className="text-xs text-muted-foreground">
                      {userUiCopy.specialPermissionsDescription}
                    </p>
                  </div>
                </div>

                {isLoadingPermissions ? (
                  <div className="flex justify-center p-4">
                    <Icons.spinner className="animate-spin size-5 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module} className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-primary" />
                          {module}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {perms.map((perm: PermissionItem) => {
                            const isFromRole = rolePermissions.has(perm.code);
                            const isSelected = selectedPermissions.includes(perm.code);

                            return (
                              <label
                                key={perm.id}
                                className={`
                                  flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer
                                  ${isFromRole ? "bg-muted/30 border-dashed opacity-70" : isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"}
                                `}
                              >
                                <Checkbox
                                  checked={isSelected || isFromRole}
                                  onCheckedChange={() => !isFromRole && handleTogglePermission(perm.code)}
                                  disabled={isFromRole}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium">{perm.name || perm.code}</span>
                                    {isFromRole && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                                        {userUiCopy.inheritedPermission}
                                      </Badge>
                                    )}
                                  </div>
                                  <code className="text-[10px] text-muted-foreground">
                                    {perm.code}
                                  </code>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>


      </SheetContent>
    </Sheet>
  );
}
