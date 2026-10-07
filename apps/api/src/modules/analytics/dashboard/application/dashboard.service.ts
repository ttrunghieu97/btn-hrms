import { Injectable } from "@nestjs/common";
import { DashboardWidgetRegistry } from "./dashboard-widget-registry";
import type { DashboardWidget } from "./interfaces/dashboard-widget.interface";
import type { DashboardContext } from "./interfaces/dashboard-context.interface";

export interface DashboardResult {
  widgets: DashboardWidget[];
  meta: {
    generatedAt: Date;
    durationMs: number;
    failedWidgets: string[];
    widgetCount: number;
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly registry: DashboardWidgetRegistry) {}

  async getWidgets(ctx: DashboardContext): Promise<DashboardResult> {
    const startedAt = Date.now();
    const definitions = this.registry.resolve(ctx);

    if (definitions.length === 0) {
      return {
        widgets: [],
        meta: {
          generatedAt: new Date(),
          durationMs: Date.now() - startedAt,
          failedWidgets: [],
          widgetCount: 0,
        },
      };
    }

    const results = await Promise.allSettled(
      definitions.map(async (def) => {
        const widgetStartedAt = Date.now();
        const data = await def.provider.execute(ctx);
        return {
          id: def.id,
          version: def.version,
          title: def.title,
          type: def.type,
          category: def.category,
          generatedAt: new Date(),
          executionTimeMs: Date.now() - widgetStartedAt,
          data,
        } satisfies DashboardWidget;
      }),
    );

    const widgets: DashboardWidget[] = [];
    const failedWidgets: string[] = [];

    for (let i = 0; i < definitions.length; i++) {
      const result = results[i];
      if (!result) continue;

      if (result.status === "fulfilled") {
        widgets.push(result.value);
      } else {
        const id = definitions[i]?.id ?? "unknown";
        failedWidgets.push(id);
        console.error(`[DashboardService] Widget "${id}" failed:`, result.reason);
      }
    }

    return {
      widgets,
      meta: {
        generatedAt: new Date(),
        durationMs: Date.now() - startedAt,
        failedWidgets,
        widgetCount: widgets.length,
      },
    };
  }
}
