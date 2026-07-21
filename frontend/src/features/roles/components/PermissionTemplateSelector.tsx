'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roleUiCopy } from '@/lib/app-copy';
import type { PermissionCatalog, RoleAssignmentMap } from '@/types/permission';

interface PermissionTemplateSelectorProps {
  catalog: PermissionCatalog;
  onApply: (assignments: RoleAssignmentMap) => void;
  disabled?: boolean;
}

export function PermissionTemplateSelector({
  catalog,
  onApply,
  disabled = false,
}: PermissionTemplateSelectorProps) {
  const handleSelect = (templateId: string) => {
    const template = catalog.templates.find(t => t.id === templateId);
    if (!template) return;

    // Convert template assignments to RoleAssignmentMap
    const newAssignments: RoleAssignmentMap = {};

    // Initialize all catalog permissions as unselected first
    catalog.permissions.forEach(p => {
      newAssignments[p.id] = { selected: false, scopeId: 'all' };
    });

    // Merge template selections
    Object.entries(template.assignments).forEach(([permissionId, assignment]) => {
      if (newAssignments[permissionId]) {
        newAssignments[permissionId] = {
          selected: assignment.selected,
          scopeId: assignment.scopeId || 'all',
        };
      }
    });

    onApply(newAssignments);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Select onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger className="w-full bg-card h-8 text-xs shadow-sm">
          <SelectValue placeholder={roleUiCopy.matrix.templateTitle} />
        </SelectTrigger>
        <SelectContent>
          {catalog.templates.map(template => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex flex-col text-left py-0.5">
                <span className="font-semibold text-sm text-foreground">{template.name}</span>
                {template.description && (
                  <span className="text-[10px] text-muted-foreground line-clamp-1">{template.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
