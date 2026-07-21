export type NavState = 'enabled' | 'disabled' | 'beta' | 'coming_soon' | 'maintenance';

export interface NavBadge {
  type: 'beta' | 'new' | 'soon' | 'maintenance';
  label?: string;
}

export interface NavItemDefinition {
  id: string;
  label: string;
  href: string;
  icon?: string;
  state?: NavState;
  children?: NavItemDefinition[];
  badge?: NavBadge;
}

export interface NavGroupDefinition {
  id: string;
  label: string;
  items: NavItemDefinition[];
}

export interface NavResponse {
  groups: NavGroupDefinition[];
  version: number;
  generatedAt: string;
}
