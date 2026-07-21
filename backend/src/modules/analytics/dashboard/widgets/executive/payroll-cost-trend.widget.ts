import { Injectable } from "@nestjs/common";
import type { DashboardWidgetProvider } from "../../application/interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import { PayrollAggregateService } from "../../infrastructure/repositories/payroll-aggregate.service";

export interface PayrollCostTrendData {
  labels: string[];
  series: number[];
}

@Injectable()
export class PayrollCostTrendWidgetProvider
  implements DashboardWidgetProvider<PayrollCostTrendData>
{
  constructor(
    private readonly payroll: PayrollAggregateService,
  ) {}

  supports(_ctx: DashboardContext): boolean {
    return true;
  }

  async execute(_ctx: DashboardContext): Promise<PayrollCostTrendData> {
    const trend = await this.payroll.getCostTrend(6);
    // getCostTrend returns desc by period start; reverse to chronological
    const reversed = [...trend].reverse();

    return {
      labels: reversed.map((r) => r.periodName),
      series: reversed.map((r) => r.totalNet),
    };
  }
}
