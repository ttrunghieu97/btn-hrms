import { Injectable } from "@nestjs/common";
import type { DashboardWidgetProvider } from "../../application/interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import { WorkforceAggregateService } from "../../infrastructure/repositories/workforce-aggregate.service";

export interface HiresLeaversSeries {
  name: string;
  data: number[];
}

export interface HiresLeaversData {
  labels: string[];
  series: HiresLeaversSeries[];
}

@Injectable()
export class HiresLeaversWidgetProvider
  implements DashboardWidgetProvider<HiresLeaversData>
{
  constructor(
    private readonly workforce: WorkforceAggregateService,
  ) {}

  supports(_ctx: DashboardContext): boolean {
    return true;
  }

  async execute(ctx: DashboardContext): Promise<HiresLeaversData> {
    const to = ctx.dateRange.end;
    const from = new Date(to);
    from.setFullYear(from.getFullYear() - 1);

    const trend = await this.workforce.getHiresLeaversTrend(from, to);

    const labels = trend.map((r) => {
      // "2026-01" → "Jan"
      const parts = r.month.split("-");
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1);
      return date.toLocaleDateString("en-US", { month: "short" });
    });

    return {
      labels,
      series: [
        { name: "Hires", data: trend.map((r) => r.hires) },
        { name: "Leavers", data: trend.map((r) => r.leavers) },
      ],
    };
  }
}
