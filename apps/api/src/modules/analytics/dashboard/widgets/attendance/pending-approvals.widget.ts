import { Injectable } from "@nestjs/common";
import type { DashboardWidgetProvider } from "../../application/interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import { ApprovalAggregateService } from "../../infrastructure/repositories/approval-aggregate.service";

export interface PendingApprovalItem {
  subjectType: string;
  count: number;
}

export interface PendingApprovalsData {
  total: number;
  items: PendingApprovalItem[];
}

@Injectable()
export class PendingApprovalsWidgetProvider
  implements DashboardWidgetProvider<PendingApprovalsData>
{
  constructor(
    private readonly approvals: ApprovalAggregateService,
  ) {}

  supports(ctx: DashboardContext): boolean {
    return ctx.currentUserId.length > 0;
  }

  async execute(ctx: DashboardContext): Promise<PendingApprovalsData> {
    return this.approvals.getPendingForUser(ctx.currentUserId);
  }
}
