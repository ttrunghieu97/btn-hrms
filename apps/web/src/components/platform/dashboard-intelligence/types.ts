export type TrendDirection = 'up' | 'down' | 'neutral';

export type AttentionSeverity = 'critical' | 'warning' | 'info' | 'success';

export type InsightCategory = 'metric' | 'chart' | 'workflow' | 'insight' | 'attention';

export interface TrendData {
  direction: TrendDirection;
  value: string;
  period?: string;
}

export interface InsightData {
  id: string;
  title: string;
  value: string;
  trend?: TrendData;
  description?: string;
}

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  severity: AttentionSeverity;
  action?: { label: string; href: string };
}

export interface SmartDashboardMetrics {
  insights: InsightData[];
  attention: AttentionItem[];
}
