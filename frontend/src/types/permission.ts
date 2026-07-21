export interface ScopeOption {
  id: string;
  label: string;
}

export interface DomainMetadata {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
}

export interface ResourceMetadata {
  id: string;
  domainId: string;
  name: string;
  icon?: string;
  order: number;
  hidden?: boolean;
  supportsScope?: boolean;
  supportsBulk?: boolean;
  supportsImport?: boolean;
}

export interface PermissionMetadata {
  id: string; // e.g. "employees:view"
  resourceId: string;
  actionId: string;
  description: string;
  critical?: boolean;
  deprecated?: boolean;
  beta?: boolean;
  hidden?: boolean;
  dependsOn?: string[]; // list of dependency permission IDs
  affectedScreens?: string[]; // screens/views affected
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  assignments: Record<string, { selected: boolean; scopeId?: string }>;
}

export interface PermissionCatalog {
  domains: DomainMetadata[];
  resources: ResourceMetadata[];
  permissions: PermissionMetadata[];
  scopes: ScopeOption[];
  templates: PermissionTemplate[];
}

export interface RoleAssignment {
  selected: boolean;
  scopeId: string;
}

export type RoleAssignmentMap = Record<string, RoleAssignment>;
