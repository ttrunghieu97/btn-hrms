import { Injectable } from "@nestjs/common";
import type { DashboardWidgetProvider } from "../../application/interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import { WorkforceAggregateService } from "../../infrastructure/repositories/workforce-aggregate.service";

export interface HeadcountData {
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  terminatedEmployees: number;
}

@Injectable()
export class HeadcountWidgetProvider
  implements DashboardWidgetProvider<HeadcountData>
{
  constructor(
    private readonly workforce: WorkforceAggregateService,
  ) {}

  supports(_ctx: DashboardContext): boolean {
    return true;
  }

  async execute(_ctx: DashboardContext): Promise<HeadcountData> {
    return this.workforce.getSnapshot();
  }
}
