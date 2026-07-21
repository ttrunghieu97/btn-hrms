import type { WidgetCategory, WidgetType } from "../../types/widget-types";
import type { DashboardWidgetProvider } from "./dashboard-widget-provider.interface";

export interface DashboardWidgetDefinition<TData = unknown> {
  /** Unique widget identifier, e.g. "headcount" */
  id: string;

  /** Widget payload schema version. Increment when shape of `data` changes. */
  version: number;

  /** When false, the widget is excluded from all responses (feature flag). */
  enabled: boolean;

  category: WidgetCategory;

  type: WidgetType;

  title: string;

  /** One of these permissions is sufficient to view this widget */
  permissions: string[];

  /** Lower number = higher priority in the response array.
   *  Secondary sort: category ASC, id ASC */
  priority: number;

  /** Cache TTL in seconds */
  cacheTTL: number;

  provider: DashboardWidgetProvider<TData>;
}
