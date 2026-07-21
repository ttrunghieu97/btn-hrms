export interface DataScope {
  tier: 'all' | 'department' | 'self';
  scopeId?: string;
  departmentId?: string;
  employeeId?: string;
}
