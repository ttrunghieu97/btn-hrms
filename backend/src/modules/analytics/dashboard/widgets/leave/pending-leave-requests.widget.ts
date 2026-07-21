import { Injectable } from "@nestjs/common";
import type { DashboardWidgetProvider } from "../../application/interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import { LeaveAggregateService } from "../../infrastructure/repositories/leave-aggregate.service";

export interface PendingLeaveItem {
  leaveTypeId: string;
  leaveTypeName: string;
  count: number;
  totalUnits: number;
}

export interface PendingLeaveRequestsData {
  items: PendingLeaveItem[];
  total: number;
}

@Injectable()
export class PendingLeaveRequestsWidgetProvider
  implements DashboardWidgetProvider<PendingLeaveRequestsData>
{
  constructor(
    private readonly leave: LeaveAggregateService,
  ) {}

  supports(_ctx: DashboardContext): boolean {
    return true;
  }

  async execute(_ctx: DashboardContext): Promise<PendingLeaveRequestsData> {
    const items = await this.leave.getPendingByType();
    const total = items.reduce((sum, i) => sum + i.count, 0);
    return { items, total };
  }
}
