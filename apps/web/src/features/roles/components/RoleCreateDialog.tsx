'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { commonUiCopy, roleUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePermissionCatalog } from '@/features/permissions';
import { useCreateRoleMutation } from '../api/queries';
import { PermissionTemplateSelector } from './PermissionTemplateSelector';
import type { Role } from '../api/service';
import type { RoleAssignmentMap } from '@/types/permission';

interface RoleCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cloneFromRole?: Role | null;
}

export function RoleCreateDialog({ open, onOpenChange, cloneFromRole = null }: RoleCreateDialogProps) {
  const router = useRouter();
  const { catalog, assignmentsToPermissionCodes } = usePermissionCatalog();
  const createMutation = useCreateRoleMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateAssignments, setTemplateAssignments] = useState<RoleAssignmentMap>({});

  const isClone = Boolean(cloneFromRole);

  useEffect(() => {
    if (!open) return;
    if (isClone && cloneFromRole) {
      setName(`${cloneFromRole.name} (Copy)`);
      setDescription(cloneFromRole.description ?? '');
      // Cloning gets all permissions of source role
      const initialMap: RoleAssignmentMap = {};
      catalog.permissions.forEach(p => {
        const isSelected = cloneFromRole.permissions?.includes(p.id) || false;
        initialMap[p.id] = { selected: isSelected, scopeId: 'all' };
      });
      setTemplateAssignments(initialMap);
    } else {
      setName('');
      setDescription('');
      setTemplateAssignments({});
    }
  }, [open, cloneFromRole, isClone, catalog]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(feedbackCopy.warning.roleNameRequired);
      return;
    }

    let permissions: string[] = [];
    if (isClone && cloneFromRole) {
      permissions = cloneFromRole.permissions || [];
    } else {
      permissions = assignmentsToPermissionCodes(templateAssignments);
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      permissions,
    };

    try {
      const newRole = await createMutation.mutateAsync(payload);
      toast.success(feedbackCopy.success.created(feedbackEntity.role));
      onOpenChange(false);
      
      // Redirect to the dedicated workspace page!
      router.push(`/administration/roles/${newRole.id}`);
    } catch {
      // Handled by query client
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isClone ? roleUiCopy.matrix.duplicate : roleUiCopy.createTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {roleUiCopy.matrix.sheetSubtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Role Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="create-role-name" className="text-xs font-bold text-muted-foreground uppercase">
              {roleUiCopy.nameLabel}
            </Label>
            <Input
              id="create-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createMutation.isPending}
              placeholder={roleUiCopy.namePlaceholder}
              className="bg-card text-sm"
            />
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="create-role-description" className="text-xs font-bold text-muted-foreground uppercase">
              {roleUiCopy.descriptionLabel}
            </Label>
            <Textarea
              id="create-role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={createMutation.isPending}
              placeholder={roleUiCopy.descriptionPlaceholder}
              rows={3}
              className="resize-none bg-card text-xs"
            />
          </div>

          {/* Template Selector (only show if not cloning) */}
          {!isClone && (
            <div className="grid gap-2 border-t pt-3.5">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  {roleUiCopy.matrix.templateTitle}
                </Label>
                <p className="text-[10px] text-muted-foreground leading-relaxed pb-1">
                  {roleUiCopy.matrix.templateWarning}
                </p>
              </div>
              <PermissionTemplateSelector
                catalog={catalog}
                onApply={setTemplateAssignments}
                disabled={createMutation.isPending}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            {commonUiCopy.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCreate()}
            isLoading={createMutation.isPending}
            disabled={!name.trim()}
          >
            {isClone ? commonUiCopy.save : commonUiCopy.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
