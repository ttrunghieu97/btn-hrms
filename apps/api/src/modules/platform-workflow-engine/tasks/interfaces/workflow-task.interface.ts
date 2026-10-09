export type WorkflowTaskDomain =
  | "leave"
  | "expense"
  | "asset"
  | "schedule"
  | "payroll"
  | "attendance"
  | "offboarding";

export interface WorkflowTask {
  id: string;
  workflowId: string;
  domain: WorkflowTaskDomain;
  domainLabel: string;
  entityId: string;
  title: string;
  subtitle: string;
  requesterName: string;
  currentState: string;
  currentStateLabel: string;
  currentStateVariant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "amber"
    | "emerald"
    | "blue";
  requiredAction: string;
  priority: "urgent" | "high" | "normal";
  createdAt?: string;
  dateRange?: string;
  detailUrl: string;
  canDirectApprove?: boolean;
  canDirectReject?: boolean;
}

export interface WorkflowTaskProvider {
  readonly domain: WorkflowTaskDomain;
  getTasks(userId: string): Promise<WorkflowTask[]>;
}

export interface WorkflowTaskAggregationMeta {
  partial: boolean;
  failedDomains: WorkflowTaskDomain[];
}

export interface AggregatedWorkflowTasksResult {
  tasks: WorkflowTask[];
  total: number;
  countsByDomain: Record<string, number>;
  meta: WorkflowTaskAggregationMeta;
}

