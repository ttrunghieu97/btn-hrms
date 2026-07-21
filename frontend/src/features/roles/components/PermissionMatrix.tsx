'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { roleUiCopy } from '@/lib/app-copy';
import { Icons } from '@/components/icons';
import type { PermissionCatalog, RoleAssignmentMap } from '@/types/permission';

const ACTION_TO_CATEGORY: Record<string, 'Access' | 'Modify' | 'Workflow' | 'Administration'> = {
  // Access
  'view': 'Access',
  'report': 'Access',
  'export': 'Access',
  'print': 'Access',
  'view:self': 'Access',
  'view:department': 'Access',
  'view:all': 'Access',

  // Modify
  'create': 'Modify',
  'edit': 'Modify',
  'update': 'Modify',
  'update:self': 'Modify',
  'update:all': 'Modify',
  'delete': 'Modify',
  'copy': 'Modify',
  'upload': 'Modify',
  'edit:self': 'Modify',
  'edit:department': 'Modify',
  'edit:all': 'Modify',

  // Workflow
  'check': 'Workflow',
  'assign': 'Workflow',
  'approve': 'Workflow',
  'approve:department': 'Workflow',
  'submit': 'Workflow',
  'reject': 'Workflow',
  'lock': 'Workflow',
  'unlock': 'Workflow',

  // Administration
  'manage': 'Administration',
  'manage_periods': 'Administration',
  'manage_payslips': 'Administration',
  'reset-password': 'Administration',
  'configure': 'Administration',
  'sync': 'Administration',
  'import': 'Administration',
  'system': 'Administration',
  'manage:sensitive': 'Administration',
  'all': 'Administration',
};

export function getActionCategory(actionId: string): 'Access' | 'Modify' | 'Workflow' | 'Administration' {
  const normalized = actionId.toLowerCase();
  if (ACTION_TO_CATEGORY[normalized]) {
    return ACTION_TO_CATEGORY[normalized];
  }
  if (normalized.includes('view') || normalized.includes('report') || normalized.includes('export') || normalized.includes('print')) {
    return 'Access';
  }
  if (normalized.includes('create') || normalized.includes('edit') || normalized.includes('update') || normalized.includes('delete') || normalized.includes('copy') || normalized.includes('upload') || normalized.includes('modify')) {
    return 'Modify';
  }
  if (normalized.includes('check') || normalized.includes('assign') || normalized.includes('approve') || normalized.includes('submit') || normalized.includes('reject') || normalized.includes('lock') || normalized.includes('unlock')) {
    return 'Workflow';
  }
  return 'Administration';
}

const CATEGORY_MAP = {
  Access: ['view', 'report', 'export', 'print', 'view:self', 'view:department', 'view:all'],
  Modify: ['create', 'edit', 'update', 'update:self', 'update:all', 'delete', 'copy', 'upload', 'edit:self', 'edit:department', 'edit:all'],
  Workflow: ['check', 'assign', 'approve', 'approve:department', 'submit', 'reject', 'lock', 'unlock'],
  Administration: ['manage', 'manage_periods', 'manage_payslips', 'reset-password', 'configure', 'sync', 'import', 'system', 'manage:sensitive', 'all']
} as const;

interface CategoryStyle {
  unselected: string;
  partial: string;
  all: string;
  bg: string;
  text: string;
  bullet: string;
}

const CATEGORY_COLORS: Record<string, CategoryStyle> = {
  Access: {
    unselected: 'bg-transparent border-blue-500/10 text-blue-500/40 hover:bg-blue-500/5',
    partial: 'bg-blue-500/10 border-blue-500/35 text-blue-700 dark:text-blue-300 dark:bg-blue-500/15',
    all: 'bg-blue-500/20 border-blue-500/60 text-blue-800 dark:text-blue-200 dark:bg-blue-500/30 font-bold shadow-[0_0_8px_rgba(59,130,246,0.15)]',
    bg: 'hover:bg-blue-500/[0.03]',
    text: 'text-blue-700 dark:text-blue-300',
    bullet: 'bg-blue-500',
  },
  Modify: {
    unselected: 'bg-transparent border-emerald-500/10 text-emerald-500/40 hover:bg-emerald-500/5',
    partial: 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/15',
    all: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-800 dark:text-emerald-200 dark:bg-emerald-500/30 font-bold shadow-[0_0_8px_rgba(16,185,129,0.15)]',
    bg: 'hover:bg-emerald-500/[0.03]',
    text: 'text-emerald-700 dark:text-emerald-300',
    bullet: 'bg-emerald-500',
  },
  Workflow: {
    unselected: 'bg-transparent border-amber-500/10 text-amber-500/40 hover:bg-amber-500/5',
    partial: 'bg-amber-500/10 border-amber-500/35 text-amber-700 dark:text-amber-300 dark:bg-amber-500/15',
    all: 'bg-amber-500/20 border-amber-500/60 text-amber-800 dark:text-amber-200 dark:bg-amber-500/30 font-bold shadow-[0_0_8px_rgba(245,158,11,0.15)]',
    bg: 'hover:bg-amber-500/[0.03]',
    text: 'text-amber-700 dark:text-amber-300',
    bullet: 'bg-amber-500',
  },
  Administration: {
    unselected: 'bg-transparent border-purple-500/10 text-purple-500/40 hover:bg-purple-500/5',
    partial: 'bg-purple-500/10 border-purple-500/35 text-purple-700 dark:text-purple-300 dark:bg-purple-500/15',
    all: 'bg-purple-500/20 border-purple-500/60 text-purple-800 dark:text-purple-200 dark:bg-purple-500/30 font-bold shadow-[0_0_8px_rgba(139,92,246,0.15)]',
    bg: 'hover:bg-purple-500/[0.03]',
    text: 'text-purple-700 dark:text-purple-300',
    bullet: 'bg-purple-500',
  },
};

interface PermissionMatrixProps {
  catalog: PermissionCatalog;
  assignments: RoleAssignmentMap;
  onChange: (value: RoleAssignmentMap) => void;
  cannotEdit?: boolean;
  search: string;
  selectedDomainId: string | null;
  selectedCategoryId: string | null;
  showOnlySelected: boolean;
  activeResourceId: string | null;
  onSelectResource: (id: string | null) => void;
  initialAssignments?: RoleAssignmentMap;
}

type GroupedRow = {
  resourceId: string;
  name: string;
  domainId: string;
  isFirstInDomain: boolean;
  domainRowSpan: number;
};

const RESOURCE_COL_MIN = 160;
const RESOURCE_COL_MAX = 400;
const RESOURCE_COL_DEFAULT = 220;

export function PermissionMatrix({
  catalog,
  assignments,
  onChange,
  cannotEdit = false,
  search,
  selectedDomainId,
  selectedCategoryId,
  showOnlySelected,
  activeResourceId,
  onSelectResource,
  initialAssignments,
}: PermissionMatrixProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [resourceColWidth, setResourceColWidth] = useState(RESOURCE_COL_DEFAULT);
  const [hoveredResourceId, setHoveredResourceId] = useState<string | null>(null);
  const [isScrolledH, setIsScrolledH] = useState(false);
  const isDraggingCol = useRef(false);

  // Group resources by domain and calculate rowspans natively
  const groupedRows = useMemo<GroupedRow[]>(() => {
    const list: GroupedRow[] = [];
    const keyword = search.trim().toLowerCase();

    catalog.domains
      .filter(domain => !selectedDomainId || domain.id === selectedDomainId)
      .sort((a, b) => a.order - b.order)
      .forEach(domain => {
        const domainResources = catalog.resources
          .filter(r => r.domainId === domain.id && !r.hidden)
          .sort((a, b) => a.order - b.order);

        const filtered = domainResources.filter(r => {
          if (keyword) {
            const matchesResourceName = r.name.toLowerCase().includes(keyword) || r.id.toLowerCase().includes(keyword);
            const resourcePerms = catalog.permissions.filter(p => p.resourceId === r.id);
            const matchesPermDesc = resourcePerms.some(p => p.description.toLowerCase().includes(keyword));
            if (!matchesResourceName && !matchesPermDesc) return false;
          }
          if (showOnlySelected) {
            const resourcePerms = catalog.permissions.filter(p => p.resourceId === r.id);
            const hasSelected = resourcePerms.some(p => assignments[p.id]?.selected);
            if (!hasSelected) return false;
          }
          if (selectedCategoryId) {
            const resourcePerms = catalog.permissions.filter(p => p.resourceId === r.id);
            const hasActions = resourcePerms.some(p => getActionCategory(p.actionId) === selectedCategoryId);
            if (!hasActions) return false;
          }
          return true;
        });

        filtered.forEach((r, idx) => {
          list.push({
            resourceId: r.id,
            name: r.name,
            domainId: domain.id,
            isFirstInDomain: idx === 0,
            domainRowSpan: filtered.length,
          });
        });
      });

    return list;
  }, [catalog, search, selectedDomainId, selectedCategoryId, showOnlySelected, assignments]);

  const handleColResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingCol.current = true;
    const startX = e.clientX;
    const startWidth = resourceColWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingCol.current) return;
      const diff = ev.clientX - startX;
      const newWidth = Math.min(RESOURCE_COL_MAX, Math.max(RESOURCE_COL_MIN, startWidth + diff));
      setResourceColWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingCol.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [resourceColWidth]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setIsScrolledH(el.scrollLeft > 4);
  }, []);

  const getDomainStatus = (domainId: string) => {
    const domainResources = catalog.resources.filter(r => r.domainId === domainId);
    const domainPerms = catalog.permissions.filter(p =>
      domainResources.some(r => r.id === p.resourceId)
    );
    const codes = domainPerms.map(p => p.id);
    const selectedCount = codes.filter(code => assignments[code]?.selected).length;
    const totalCount = codes.length;
    return { allChecked: totalCount > 0 && selectedCount === totalCount, someChecked: selectedCount > 0 && selectedCount < totalCount, codes };
  };

  const getResourceStatus = (resourceId: string) => {
    const resourcePerms = catalog.permissions.filter(p => p.resourceId === resourceId);
    const codes = resourcePerms.map(p => p.id);
    const selectedCount = codes.filter(code => assignments[code]?.selected).length;
    const totalCount = codes.length;
    return {
      allChecked: totalCount > 0 && selectedCount === totalCount,
      someChecked: selectedCount > 0 && selectedCount < totalCount,
      codes,
    };
  };

  const getGlobalStatus = () => {
    const codes = catalog.permissions.map(p => p.id);
    const selectedCount = codes.filter(code => assignments[code]?.selected).length;
    const totalCount = codes.length;
    return { allChecked: totalCount > 0 && selectedCount === totalCount, someChecked: selectedCount > 0 && selectedCount < totalCount, codes };
  };

  const getCategoryGlobalStatus = (category: string) => {
    const categoryPermissions = catalog.permissions.filter(p => {
      return getActionCategory(p.actionId) === category;
    });
    const codes = categoryPermissions.map(p => p.id);
    const selectedCount = codes.filter(code => assignments[code]?.selected).length;
    const totalCount = codes.length;
    return {
      allChecked: totalCount > 0 && selectedCount === totalCount,
      someChecked: selectedCount > 0 && selectedCount < totalCount,
      codes,
    };
  };

  const handleToggleCategoryGlobally = (category: string, checked: boolean) => {
    if (cannotEdit) return;
    const { codes } = getCategoryGlobalStatus(category);
    handleToggleGroup(codes, checked);
  };

  const handleToggleCellGroup = (resourceId: string, categoryActionIds: string[], checked: boolean) => {
    if (cannotEdit) return;
    const newAssignments = { ...assignments };
    categoryActionIds.forEach(actionId => {
      const permissionId = `${resourceId}:${actionId}`;
      const exists = catalog.permissions.some(p => p.id === permissionId);
      if (exists) {
        newAssignments[permissionId] = { selected: checked, scopeId: assignments[permissionId]?.scopeId || 'all' };
        if (checked) {
          const meta = catalog.permissions.find(p => p.id === permissionId);
          meta?.dependsOn?.forEach(depId => {
            newAssignments[depId] = { selected: true, scopeId: assignments[depId]?.scopeId || 'all' };
          });
        } else {
          catalog.permissions.forEach(p => {
            if (p.dependsOn?.includes(permissionId) && newAssignments[p.id]?.selected) {
              newAssignments[p.id] = { selected: false, scopeId: assignments[p.id]?.scopeId || 'all' };
            }
          });
        }
      }
    });
    onChange(newAssignments);
  };

  const handleGrantCategory = (resourceId: string, category: string, grant: boolean) => {
    if (cannotEdit) return;
    const actionIds = CATEGORY_MAP[category as keyof typeof CATEGORY_MAP];
    if (!actionIds) return;
    const newAssignments = { ...assignments };
    actionIds.forEach(actionId => {
      const permissionId = `${resourceId}:${actionId}`;
      const exists = catalog.permissions.some(p => p.id === permissionId);
      if (exists) {
        newAssignments[permissionId] = { selected: grant, scopeId: assignments[permissionId]?.scopeId || 'all' };
      }
    });
    onChange(newAssignments);
  };

  const handleClearResource = (resourceId: string) => {
    if (cannotEdit) return;
    const resourcePerms = catalog.permissions.filter(p => p.resourceId === resourceId);
    const newAssignments = { ...assignments };
    resourcePerms.forEach(p => {
      newAssignments[p.id] = { selected: false, scopeId: assignments[p.id]?.scopeId || 'all' };
    });
    onChange(newAssignments);
  };

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

  const handleToggleGroup = (codes: string[], checked: boolean) => {
    if (cannotEdit) return;
    const newAssignments = { ...assignments };
    codes.forEach(code => {
      newAssignments[code] = { selected: checked, scopeId: assignments[code]?.scopeId || 'all' };
      if (checked) {
        const meta = catalog.permissions.find(p => p.id === code);
        meta?.dependsOn?.forEach(depId => { newAssignments[depId] = { selected: true, scopeId: assignments[depId]?.scopeId || 'all' }; });
      } else {
        catalog.permissions.forEach(p => { if (p.dependsOn?.includes(code) && newAssignments[p.id]?.selected) { newAssignments[p.id] = { selected: false, scopeId: assignments[p.id]?.scopeId || 'all' }; } });
      }
    });
    onChange(newAssignments);
  };

  const getActionLabel = (actionId: string) => {
    const key = actionId === 'reset-password' ? 'resetPassword' : actionId;
    return roleUiCopy.matrix.actions[key as keyof typeof roleUiCopy.matrix.actions] || actionId;
  };

  const globalStatus = getGlobalStatus();

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableElement>) => {
    const active = document.activeElement;
    if (!active || !active.classList.contains('matrix-focusable')) return;

    const row = parseInt(active.getAttribute('data-row') || '0', 10);
    const col = parseInt(active.getAttribute('data-col') || '0', 10);
    const isBulk = active.getAttribute('data-bulk') === 'true';

    const focusTarget = (elements: NodeListOf<Element>, targetBulk: boolean) => {
      if (elements.length === 0) return;
      if (elements.length === 1) {
        (elements[0] as HTMLElement).focus();
      } else {
        const master = Array.from(elements).find(el => el.getAttribute('data-bulk') === 'true') as HTMLElement;
        const badge = Array.from(elements).find(el => el.getAttribute('data-bulk') !== 'true') as HTMLElement;
        if (targetBulk && master) {
          master.focus();
        } else if (badge) {
          badge.focus();
        } else {
          (elements[0] as HTMLElement).focus();
        }
      }
    };

    const findAndFocus = (r: number, c: number, targetBulk: boolean) => {
      if (r < 0 || r >= groupedRows.length) return false;
      const elements = tableRef.current?.querySelectorAll(`.matrix-focusable[data-row="${r}"][data-col="${c}"]`);
      if (elements && elements.length > 0) {
        focusTarget(elements, targetBulk);
        return true;
      }
      return false;
    };

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        for (let r = row - 1; r >= -1; r--) {
          if (r === -1) {
            const elements = tableRef.current?.querySelectorAll(`.matrix-focusable[data-row="-1"][data-col="${col}"]`);
            if (elements && elements.length > 0) {
              (elements[0] as HTMLElement).focus();
              break;
            }
          } else {
            if (findAndFocus(r, col, isBulk)) break;
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        for (let r = row + 1; r <= groupedRows.length; r++) {
          if (r === groupedRows.length) break;
          if (findAndFocus(r, col, isBulk)) break;
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (col > 0) {
          if (col >= 2 && !isBulk) {
            const cellElements = tableRef.current?.querySelectorAll(`.matrix-focusable[data-row="${row}"][data-col="${col}"]`);
            const bulkEl = Array.from(cellElements || []).find(el => el.getAttribute('data-bulk') === 'true') as HTMLElement;
            if (bulkEl) {
              bulkEl.focus();
              break;
            }
          }
          // Go to previous column
          for (let c = col - 1; c >= 0; c--) {
            const elms = tableRef.current?.querySelectorAll(`.matrix-focusable[data-row="${row}"][data-col="${c}"]`);
            if (elms && elms.length > 0) {
              focusTarget(elms, false);
              break;
            }
          }
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (col >= 2 && isBulk) {
          const cellElements = tableRef.current?.querySelectorAll(`.matrix-focusable[data-row="${row}"][data-col="${col}"]`);
          const badgeEl = Array.from(cellElements || []).find(el => el.getAttribute('data-bulk') !== 'true') as HTMLElement;
          if (badgeEl) {
            badgeEl.focus();
            break;
          }
        }
        // Go to next column
        for (let c = col + 1; c <= 5; c++) {
          const elms = tableRef.current?.querySelectorAll(`.matrix-focusable[data-row="${row}"][data-col="${c}"]`);
          if (elms && elms.length > 0) {
            focusTarget(elms, true);
            break;
          }
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative scrollbar-thin"
        onScroll={handleScroll}
      >
        <table
          ref={tableRef}
          onKeyDown={handleKeyDown}
          className="w-full border-collapse border-spacing-0 text-sm select-none focus:outline-none"
          tabIndex={-1}
        >
          {/* Table Header */}
          <thead className="sticky top-0 z-30 bg-muted/95 backdrop-blur-sm border-b-2 border-border/60">
            <tr>
              {/* Col 0: Domain */}
              <th
                className={cn(
                  "sticky left-0 top-0 z-40 bg-muted/95 backdrop-blur-sm text-left font-semibold text-muted-foreground border-r py-3 px-4",
                  isScrolledH && "shadow-[2px_0_8px_rgba(0,0,0,0.08)]"
                )}
                style={{ width: 120 }}
              >
                <span className="text-xs uppercase tracking-wider">{roleUiCopy.matrix.domain}</span>
              </th>

              {/* Col 1: Resource */}
              <th
                className={cn(
                  "sticky left-[120px] top-0 z-40 bg-muted/95 backdrop-blur-sm text-left font-semibold text-muted-foreground border-r py-3 px-4",
                  isScrolledH && "shadow-[2px_0_8px_rgba(0,0,0,0.08)]"
                )}
                style={{ width: resourceColWidth }}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    className="size-4.5 matrix-focusable"
                    data-row={-1}
                    data-col={1}
                    checked={globalStatus.allChecked ? true : globalStatus.someChecked ? 'indeterminate' : false}
                    onCheckedChange={(checked) => handleToggleGroup(globalStatus.codes, checked === true)}
                    disabled={cannotEdit}
                  />
                  <span className="text-xs uppercase tracking-wider">{roleUiCopy.matrix.resource}</span>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-50" onMouseDown={handleColResizeMouseDown} />
              </th>
              
              {(['Access', 'Modify', 'Workflow', 'Administration'] as const).map((category, colIdx) => {
                const categoryStatus = getCategoryGlobalStatus(category);
                const label = category === 'Access' ? roleUiCopy.matrix.categoryAccess
                  : category === 'Modify' ? roleUiCopy.matrix.categoryModify
                  : category === 'Workflow' ? roleUiCopy.matrix.categoryWorkflow
                  : roleUiCopy.matrix.categoryAdministration;
                const colorStyle = CATEGORY_COLORS[category];

                return (
                  <th
                    key={category}
                    className={cn(
                      "w-0 flex-grow text-center border-r last:border-r-0 border-border/40 p-2 min-w-[150px]",
                      colorStyle.bg
                    )}
                  >
                    <div className="flex flex-col items-center gap-1.5 py-1">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider", colorStyle.text)}>{label}</span>
                      <Checkbox
                        className="size-4.5 matrix-focusable"
                        data-row={-1}
                        data-col={colIdx + 2}
                        checked={categoryStatus.allChecked ? true : categoryStatus.someChecked ? 'indeterminate' : false}
                        onCheckedChange={(checked) => handleToggleCategoryGlobally(category, checked === true)}
                        disabled={cannotEdit}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {groupedRows.map((row, rowIndex) => {
              const { resourceId, name, domainId, isFirstInDomain, domainRowSpan } = row;

              const domainStatus = getDomainStatus(domainId);
              const resourceStatus = getResourceStatus(resourceId);

              const isSelected = activeResourceId === resourceId;
              const isHovered = hoveredResourceId === resourceId;
              const hasQuickActions = isHovered && !cannotEdit;

              const isRowDirty = initialAssignments
                ? catalog.permissions.filter(p => p.resourceId === resourceId).some(p =>
                    (assignments[p.id]?.selected ?? false) !== (initialAssignments[p.id]?.selected ?? false)
                  )
                : false;

              // Helper for conditional border-t inside merged domain blocks
              const isFirstRowOverallOfDomain = rowIndex === 0 || groupedRows[rowIndex - 1].domainId !== domainId;

              return (
                <tr
                  key={`resource-${resourceId}`}
                  onClick={() => onSelectResource(isSelected ? null : resourceId)}
                  onMouseEnter={() => setHoveredResourceId(resourceId)}
                  onMouseLeave={() => setHoveredResourceId(null)}
                  className={cn(
                    "transition-colors duration-100 group relative border-b border-border/45",
                    isSelected ? "bg-primary/[0.04] dark:bg-primary/[0.08]" : "hover:bg-muted/30"
                  )}
                  style={{ height: 44 }}
                >
                  {/* Sticky Domain Column (Col 0) - Merged using native rowSpan */}
                  {isFirstInDomain && (
                    <td
                      rowSpan={domainRowSpan}
                      className={cn(
                        "sticky left-0 z-20 border-r border-b border-border/45 text-left bg-card px-4 py-2 font-medium vertical-middle align-middle transition-colors duration-100",
                        isScrolledH && "shadow-[2px_0_8px_rgba(0,0,0,0.08)]",
                        // Add top border to differentiate domain blocks
                        rowIndex > 0 && "border-t border-t-primary/25"
                      )}
                      style={{ width: 120 }}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          className="size-4.5 matrix-focusable shrink-0"
                          data-row={rowIndex}
                          data-col={0}
                          checked={domainStatus.allChecked ? true : domainStatus.someChecked ? 'indeterminate' : false}
                          onCheckedChange={(checked) => handleToggleGroup(domainStatus.codes, checked === true)}
                          disabled={cannotEdit}
                        />
                        <span className="text-[10px] font-bold text-primary/80 uppercase truncate max-w-[85px] block" title={catalog.domains.find(d => d.id === domainId)?.name || domainId}>
                          {catalog.domains.find(d => d.id === domainId)?.name || domainId}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Sticky Resource Column (Col 1) */}
                  <td
                    className={cn(
                      "sticky left-[120px] z-20 border-r border-b border-border/45 px-4 py-2 text-left h-full transition-colors duration-100",
                      isSelected ? "bg-primary/[0.04] dark:bg-primary/[0.08]" : isHovered ? "bg-muted/30" : "bg-card",
                      isScrolledH && "shadow-[2px_0_8px_rgba(0,0,0,0.08)]",
                      // Top border if first row in a domain group to align with domain border
                      !isFirstInDomain && isFirstRowOverallOfDomain && "border-t border-t-primary/25"
                    )}
                    style={{ width: resourceColWidth }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 w-full justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          className="size-4.5 matrix-focusable shrink-0"
                          data-row={rowIndex}
                          data-col={1}
                          checked={resourceStatus.allChecked ? true : resourceStatus.someChecked ? 'indeterminate' : false}
                          onCheckedChange={(checked) => handleToggleGroup(resourceStatus.codes, checked === true)}
                          disabled={cannotEdit}
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={cn("truncate text-sm font-medium transition-colors", isSelected ? "text-primary" : "text-foreground/90")}>
                              {name}
                            </span>
                            {isRowDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title={['Đã thay đổi'].join('')} />}
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] text-muted-foreground font-mono truncate cursor-help max-w-[120px] block">{resourceId}</span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[240px]">
                              <p className="font-medium text-xs">{['Mã tài nguyên:'].join('')} <code className="font-mono">{resourceId}</code></p>
                              <p className="text-[10px] text-primary-foreground/70 mt-0.5">{['Dùng để mapping với API endpoints và permission checks'].join('')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      {isSelected && <Icons.chevronRight className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  </td>

                  {/* Capability columns (4 columns - cols 2 to 5) */}
                  {(['Access', 'Modify', 'Workflow', 'Administration'] as const).map((category, colIdx) => {
                    const colorStyle = CATEGORY_COLORS[category];
                    const resourcePerms = catalog.permissions.filter(
                      p => p.resourceId === resourceId && getActionCategory(p.actionId) === category
                    );

                    if (resourcePerms.length === 0) {
                      return (
                        <td
                          key={category}
                          className="text-center border-r last:border-r-0 border-b border-border/40 text-muted-foreground/35 select-none min-w-[150px] p-2"
                        >
                          —
                        </td>
                      );
                    }

                    const selectedPerms = resourcePerms.filter(p => assignments[p.id]?.selected);
                    const totalCount = resourcePerms.length;
                    const selectedCount = selectedPerms.length;
                    const allChecked = selectedCount === totalCount;
                    const someChecked = selectedCount > 0 && selectedCount < totalCount;

                    const activeStyle = allChecked
                      ? colorStyle.all
                      : someChecked
                      ? colorStyle.partial
                      : colorStyle.unselected;

                    const label = category === 'Access' ? roleUiCopy.matrix.categoryAccess
                      : category === 'Modify' ? roleUiCopy.matrix.categoryModify
                      : category === 'Workflow' ? roleUiCopy.matrix.categoryWorkflow
                      : roleUiCopy.matrix.categoryAdministration;

                    return (
                      <td
                        key={category}
                        className={cn(
                          "border-r last:border-r-0 border-b border-border/40 p-2 bg-transparent group/cell relative transition-colors duration-100 min-w-[150px] text-center align-middle justify-center",
                          isHovered && colorStyle.bg
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5 relative w-full h-full">
                          {/* Cell-level select all checkbox (visible on hover/focus) */}
                          {totalCount > 1 && (
                            <Checkbox
                              className="size-3.5 matrix-focusable opacity-0 group-hover/cell:opacity-100 focus:opacity-100 transition-opacity shrink-0 absolute left-1 top-[6px]"
                              data-row={rowIndex}
                              data-col={colIdx + 2}
                              data-bulk="true"
                              checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                              onCheckedChange={(checked) => handleToggleCellGroup(resourceId, resourcePerms.map(p => p.actionId), checked === true)}
                              disabled={cannotEdit}
                            />
                          )}

                          <Popover>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    data-row={rowIndex}
                                    data-col={colIdx + 2}
                                    className={cn(
                                      "matrix-focusable transition-all select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-full px-2.5 py-0.5 border text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 w-[72px] h-7 mx-auto",
                                      activeStyle
                                    )}
                                  >
                                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", colorStyle.bullet)} />
                                    <span>{selectedCount}/{totalCount}</span>
                                  </button>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[240px]">
                                <p className="font-semibold text-xs">{label} ({selectedCount}/{totalCount})</p>
                                {selectedCount > 0 ? (
                                  <p className="text-[10px] opacity-85 mt-0.5">
                                    {['Đã cấp:'].join('')} {selectedPerms.map(p => getActionLabel(p.actionId)).join(', ')}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{['Chưa cấp quyền nào'].join('')}</p>
                                )}
                              </TooltipContent>
                            </Tooltip>

                            <PopoverContent className="w-72 max-h-80 overflow-y-auto p-3" align="center" side="bottom">
                              <div className="flex flex-col gap-2.5">
                                <div className="flex items-center justify-between border-b pb-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`popover-bulk-${resourceId}-${category}`}
                                      checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                                      onCheckedChange={(checked) => handleToggleCellGroup(resourceId, resourcePerms.map(p => p.actionId), checked === true)}
                                      disabled={cannotEdit}
                                    />
                                    <label
                                      htmlFor={`popover-bulk-${resourceId}-${category}`}
                                      className="text-xs font-bold uppercase tracking-wider text-foreground/90 cursor-pointer"
                                    >
                                      {label} ({selectedCount}/{totalCount})
                                    </label>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {resourcePerms.map(permission => {
                                    const isChecked = assignments[permission.id]?.selected || false;
                                    const label = getActionLabel(permission.actionId);

                                    return (
                                      <div key={permission.id} className="flex items-start gap-2.5">
                                        <Checkbox
                                          id={`popover-item-${permission.id}`}
                                          checked={isChecked}
                                          onCheckedChange={(checked) => handleToggleCell(permission.id, checked === true)}
                                          disabled={cannotEdit}
                                          className="size-4.5 mt-0.5"
                                        />
                                        <div className="grid gap-0.5 leading-tight">
                                          <label
                                            htmlFor={`popover-item-${permission.id}`}
                                            className="text-xs font-semibold leading-none cursor-pointer text-foreground/90 hover:text-foreground"
                                          >
                                            {label}
                                          </label>
                                          {permission.description && (
                                            <p className="text-[10px] text-muted-foreground leading-normal">
                                              {permission.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Quick Actions — absolute floating overlay on hover nested inside the last cell to prevent layout jump */}
                        {category === 'Administration' && hasQuickActions && (
                          <div className="absolute right-0 top-0 bottom-0 z-30 flex items-center gap-0.5 px-2 bg-background border-l border-b border-border/40 shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button type="button"
                              className="flex items-center justify-center h-6 w-6 rounded text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleGrantCategory(resourceId, 'Access', true); }}
                              title={['Cấp quyền Truy cập'].join('')}>A</button>
                            <button type="button"
                              className="flex items-center justify-center h-6 w-6 rounded text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleGrantCategory(resourceId, 'Modify', true); }}
                              title={['Cấp quyền Thay đổi'].join('')}>M</button>
                            <button type="button"
                              className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleClearResource(resourceId); }}
                              title={['Xóa tất cả'].join('')}>
                              <Icons.close className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
