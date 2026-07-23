export interface DashboardDateRange {
  start: Date;
  end: Date;
}

export interface DashboardContext {
  companyId: string;
  dateRange: DashboardDateRange;
  currentUserId: string;
  currentUserPermissions: string[];
  currentUserRoles: string[];
  timezone: string;
  locale: string;
}
