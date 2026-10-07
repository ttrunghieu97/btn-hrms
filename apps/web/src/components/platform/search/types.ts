export type SearchEntityType =
  | 'employee'
  | 'document'
  | 'approval'
  | 'contract'
  | 'leave'
  | 'payroll'
  | 'task'
  | 'notification';

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  href: string;
  /** Required permission to view this result (empty = visible to all) */
  permission?: string;
}

export interface SearchProvider {
  /** Unique provider ID */
  id: string;
  /** Label shown in search group header */
  label: string;
  /** Search function — called with current query */
  search: (query: string) => Promise<SearchResult[]> | SearchResult[];
}

export interface SearchGroup {
  label: string;
  results: SearchResult[];
}
