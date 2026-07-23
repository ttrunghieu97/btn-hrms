import { Injectable } from "@nestjs/common";
import type { DashboardWidgetProvider } from "../../application/interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import { WorkforceAggregateService } from "../../infrastructure/repositories/workforce-aggregate.service";

export interface EmployeeStatusData {
  labels: string[];
  series: number[];
}

@Injectable()
export class EmployeeStatusWidgetProvider
  implements DashboardWidgetProvider<EmployeeStatusData>
{
  constructor(
    private readonly workforce: WorkforceAggregateService,
  ) {}

  supports(_ctx: DashboardContext): boolean {
    return true;
  }

  async execute(ctx: DashboardContext): Promise<EmployeeStatusData> {
    const distribution = await this.workforce.getStatusDistribution(ctx);
    return {
      labels: distribution.map((d) => d.status),
      series: distribution.map((d) => d.count),
    };
  }
}
