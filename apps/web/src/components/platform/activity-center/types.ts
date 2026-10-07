export type ActivityType = 'approval' | 'employee' | 'attendance' | 'payroll' | 'document' | 'security' | 'system' | 'notification';

export type ActivitySeverity = 'info' | 'warning' | 'critical';

export interface ActivityActor {
  id: string;
  name: string;
}

export interface ActivityEntity {
  type: string;
  id: string;
  href?: string;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  actor?: ActivityActor;
  timestamp: string;
  severity: ActivitySeverity;
  entity?: ActivityEntity;
}

export interface ActivityQuery {
  limit?: number;
  types?: ActivityType[];
  since?: string;
}

export interface ActivityProvider {
  id: string;
  label: string;
  getActivities: (query: ActivityQuery) => Promise<ActivityItem[]>;
}
