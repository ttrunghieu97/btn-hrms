import { Injectable } from "@nestjs/common";
import type { DashboardWidgetProvider } from "../../application/interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import { WorkforceAggregateService } from "../../infrastructure/repositories/workforce-aggregate.service";

export interface DepartmentHeadcountData {
  labels: string[];
  series: number[];
}

@Injectable()
export class DepartmentHeadcountWidgetProvider
  implements DashboardWidgetProvider<DepartmentHeadcountData>
{
  constructor(
    private readonly workforce: WorkforceAggregateService,
  ) {}

  supports(_ctx: DashboardContext): boolean {
    return true;
  }

  async execute(ctx: DashboardContext): Promise<DepartmentHeadcountData> {
    const departments = await this.workforce.getDepartmentHeadcounts();
    return {
      labels: departments.map((d) => d.departmentName),
      series: departments.map((d) => d.count),
    };
  }
}
