import type { DashboardContext } from "./dashboard-context.interface";

export interface DashboardWidgetProvider<TData> {
  /** Quick pre-filter: returns false to skip this widget for the current user */
  supports(ctx: DashboardContext): boolean;

  /** Execute the widget query and return its data payload */
  execute(ctx: DashboardContext): Promise<TData>;
}
