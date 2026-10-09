import { customFetch } from '@/lib/fetcher';

export type WorkflowTaskDomain =
  | 'all'
  | 'leave'
  | 'expense'
  | 'asset'
  | 'schedule'
  | 'payroll'
  | 'attendance'
  | 'offboarding';

export interface WorkflowTaskItem {
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
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'amber'
    | 'emerald'
    | 'blue';
  requiredAction: string;
  priority: 'urgent' | 'high' | 'normal';
  createdAt?: string;
  dateRange?: string;
  detailUrl: string;
  canDirectApprove?: boolean;
  canDirectReject?: boolean;
}

export interface WorkflowTaskAggregationMeta {
  partial: boolean;
  failedDomains: WorkflowTaskDomain[];
}

export interface WorkflowTasksResponse {
  tasks: WorkflowTaskItem[];
  total: number;
  countsByDomain: Record<string, number>;
  meta?: WorkflowTaskAggregationMeta;
}


export async function fetchMyWorkflowTasks(
  domain?: WorkflowTaskDomain,
): Promise<WorkflowTasksResponse> {
  const query = domain && domain !== 'all' ? `?domain=${domain}` : '';
  return customFetch(`/workflow/tasks/my${query}`);
}
