export { ActivityTimeline } from './activity-timeline';
export type { TimelineItem, TimelineItemStatus, ActivityTimelineProps } from './activity-timeline';

export { StatusCard, MetricCard, QuickActionCard } from './cards';
export type { StatusCardProps, StatusVariant, MetricCardProps, QuickActionCardProps, QuickAction } from './cards';

export { WorkflowTimeline, WorkflowStatusBadge, mapApprovalHistory, mapApprovalStepToTimelineItem } from './workflow-timeline';
export type { WorkflowTimelineItem, WorkflowStatus, WorkflowTimelineProps, ApprovalStepInput } from './workflow-timeline';

export { InsightCard, TrendIndicator, AttentionCard } from './dashboard-intelligence';
export type { InsightData, AttentionItem, AttentionSeverity, TrendDirection, TrendData, SmartDashboardMetrics, InsightCategory } from './dashboard-intelligence';

export { SearchCommand, SearchEngine, getSearchEngine, employeeSearchProvider, navigationSearchProvider } from './search';
export type { SearchResult, SearchProvider, SearchGroup, SearchEntityType } from './search';

export { ActivityCenter, ActivityCenterFeed, ActivityEngine, getActivityEngine } from './activity-center';
export type { ActivityItem, ActivityType, ActivitySeverity, ActivityQuery, ActivityProvider } from './activity-center';

export type { DashboardWidget, DashboardWidgetRegistry } from './widget-registry';
export { createWidgetRegistry } from './widget-registry';
