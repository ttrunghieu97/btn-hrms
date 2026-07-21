import type { ReactNode } from 'react';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';

/**
 * Widget renderer registry.
 * Maps widget.id → React component.
 * Register new widgets here — no other platform file needs changing.
 */
type WidgetComponent = (props: { widget: DashboardWidgetDto }) => ReactNode;

const registry = new Map<string, WidgetComponent>();

export function registerWidget(id: string, component: WidgetComponent): void {
  if (registry.has(id)) return;
  registry.set(id, component);
}

export function getWidgetComponent(id: string): WidgetComponent | undefined {
  return registry.get(id);
}
