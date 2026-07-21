import type { WidgetCategory, WidgetType } from "../../types/widget-types";

export interface DashboardWidget<TData = unknown> {
  id: string;
  version: number;
  title: string;
  type: WidgetType;
  category: WidgetCategory;
  generatedAt: Date;
  executionTimeMs: number;
  data: TData;
}
