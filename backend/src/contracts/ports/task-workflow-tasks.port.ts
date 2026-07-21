export type WorkflowTaskStatus =
  | "created"
  | "assigned"
  | "in_progress"
  | "declined"
  | "submitted"
  | "revision"
  | "completed"
  | "cancelled";

export interface WorkflowTaskRecord {
  id: string;
  status: WorkflowTaskStatus;
  assigneeId?: string | null;
  createdByUserId?: string | null;
  assignee?: { departmentId?: string | null } | null;
  revisionCount?: number | null;
  priority?: string | null;
  title?: string | null;
  resultText?: string | null;
  checklist?: string | null;
}

export type TaskWorkflowTransaction = object;

export interface WorkflowTaskPatch {
  status?: WorkflowTaskStatus;
  startedAt?: Date | null;
  submittedAt?: Date | null;
  completedAt?: Date | null;
  resultText?: string | null;
  progress?: string;
  rejectionReason?: string | null;
  revisionReason?: string | null;
  cancellationReason?: string | null;
  revisionCount?: number;
}

export type WorkflowTaskActivityAction =
  | "approved"
  | "cancelled"
  | "created"
  | "assigned"
  | "declined"
  | "submitted"
  | "accepted"
  | "returned"
  | "resubmitted"
  | "status_changed"
  | "progress_updated"
  | "unassigned";

export interface WorkflowTaskActivity {
  taskId: string;
  actorUserId: string | null;
  action: WorkflowTaskActivityAction;
  fromStatus?: WorkflowTaskStatus | null;
  toStatus?: WorkflowTaskStatus | null;
  metadata?: Record<string, unknown> | null;
}

export interface WorkflowTaskSubmission {
  taskId: string;
  submittedByUserId: string | null;
  version: number;
  resultText?: string | null;
  checklist?: unknown[] | null;
  submittedAt: Date;
}

export interface WorkflowTaskNotification {
  userId: string;
  taskId: string;
  type: string;
  title: string;
  body?: string | null;
}

export interface TaskWorkflowTasksPort {
  findById(taskId: string): Promise<WorkflowTaskRecord | null>;

  updateWithOptimisticLock(
    taskId: string,
    expectedStatus: WorkflowTaskStatus,
    patch: WorkflowTaskPatch,
    db?: TaskWorkflowTransaction,
  ): Promise<WorkflowTaskRecord | null>;

  addActivity(
    activity: WorkflowTaskActivity,
    db?: TaskWorkflowTransaction,
  ): Promise<void>;

  addAssignment(
    taskId: string,
    assigneeEmployeeId: string,
    actorUserId: string | null,
    db?: TaskWorkflowTransaction,
  ): Promise<void>;

  getUserIdByEmployeeId(
    employeeId: string,
    db?: TaskWorkflowTransaction,
  ): Promise<string | null>;

  getNextSubmissionVersion(
    taskId: string,
    db?: TaskWorkflowTransaction,
  ): Promise<number>;

  addSubmission(
    payload: WorkflowTaskSubmission,
    db?: TaskWorkflowTransaction,
  ): Promise<void>;

  update(
    taskId: string,
    patch: WorkflowTaskPatch,
    db?: TaskWorkflowTransaction,
  ): Promise<void>;

  createNotification(
    notification: WorkflowTaskNotification,
    db?: TaskWorkflowTransaction,
  ): Promise<void>;
}
