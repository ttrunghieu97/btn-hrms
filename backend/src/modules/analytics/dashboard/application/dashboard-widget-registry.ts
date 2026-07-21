import { Injectable } from "@nestjs/common";
import type { DashboardWidgetDefinition } from "./interfaces/dashboard-widget-definition.interface";
import type { DashboardContext } from "./interfaces/dashboard-context.interface";

@Injectable()
export class DashboardWidgetRegistry {
  private readonly definitions = new Map<string, DashboardWidgetDefinition>();

  register<TData>(definition: DashboardWidgetDefinition<TData>): void {
    if (this.definitions.has(definition.id)) {
      return; // idempotent
    }
    this.definitions.set(definition.id, definition);
  }

  getAll(): DashboardWidgetDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Returns enabled definitions the current user is permitted to see, sorted by priority ASC, category ASC, id ASC */
  resolve(ctx: DashboardContext): DashboardWidgetDefinition[] {
    return this.getAll()
      .filter((def) => {
        if (!def.enabled) return false;

        const hasPermission =
          ctx.currentUserPermissions.includes("ALL") ||
          def.permissions.length === 0 ||
          def.permissions.some((p) => ctx.currentUserPermissions.includes(p));

        if (!hasPermission) return false;

        return def.provider.supports(ctx);
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.id.localeCompare(b.id);
      });
  }
}
