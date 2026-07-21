import { Module } from "@nestjs/common";
import { MetricsModule } from "../../../shared/metrics/metrics.module";
import { StorageModule } from "../../../infrastructure/storage/storage.module";
import { TaskSlaService } from "./jobs/task-sla.service";
import { TasksController } from "./tasks.controller";
import { TasksRepository } from "./repositories/tasks.repository";
import { TasksTransactionsRepository } from "./repositories/tasks-transactions.repository";
import { ListTasksUseCase } from "./use-cases/list-tasks.usecase";
import { ListMyTasksUseCase } from "./use-cases/list-my-tasks.usecase";
import { CreateTaskUseCase } from "./use-cases/create-task.usecase";
import { TaskEmployeeHiredSubscriber } from "./subscribers/employee-hired.subscriber";
import { UpdateTaskUseCase } from "./use-cases/update-task.usecase";
import { DeleteTaskUseCase } from "./use-cases/delete-task.usecase";
import { ListTaskAssignmentsUseCase } from "./use-cases/list-task-assignments.usecase";
import { ListTaskActivitiesUseCase } from "./use-cases/list-task-activities.usecase";
import { AcceptTaskUseCase } from "./use-cases/accept-task.usecase";
import { RejectTaskUseCase } from "./use-cases/reject-task.usecase";
import { SubmitTaskUseCase } from "./use-cases/submit-task.usecase";
import { ApproveTaskUseCase } from "./use-cases/approve-task.usecase";
import { ReturnTaskUseCase } from "./use-cases/return-task.usecase";
import { TaskNotificationsRepository } from "./notifications/task-notifications.repository";
import { TaskActivitiesRepository } from "./repositories/task-activities.repository";
import { TaskDependenciesRepository } from "./repositories/task-dependencies.repository";
import { TaskDelegationsRepository } from "./repositories/task-delegations.repository";
import { TaskSlaRepository } from "./repositories/task-sla.repository";
import { TaskAnalyticsRepository } from "./repositories/task-analytics.repository";
import { TaskNotificationsService } from "./notifications/task-notifications.service";
import { TaskEventsService } from "./realtime/task-events.service";
import { ListTaskCommentsUseCase } from "./use-cases/list-task-comments.usecase";
import { CreateTaskCommentUseCase } from "./use-cases/create-task-comment.usecase";
import { DeleteTaskCommentUseCase } from "./use-cases/delete-task-comment.usecase";
import { ListTaskAttachmentsUseCase } from "./use-cases/list-task-attachments.usecase";
import { UploadTaskAttachmentUseCase } from "./use-cases/upload-task-attachment.usecase";
import { DeleteTaskAttachmentUseCase } from "./use-cases/delete-task-attachment.usecase";
import { ListTaskSubmissionsUseCase } from "./use-cases/list-task-submissions.usecase";
import { BulkAssignTaskUseCase } from "./use-cases/bulk-assign-task.usecase";
import { TaskReminderService } from "./reminders/task-reminder.service";
import { ManageTaskDependenciesUseCase } from "./use-cases/manage-task-dependencies.usecase";
import { TaskAnalyticsUseCase } from "./use-cases/task-analytics.usecase";
import { ManageTaskDelegationsUseCase } from "./use-cases/manage-task-delegations.usecase";
import { TaskAssigneePerformanceReportUseCase } from "./use-cases/task-assignee-performance-report.usecase";
import { MyTaskSummaryRepository } from "./repositories/my-task-summary.repository";
import { MyTaskSummaryUseCase } from "./use-cases/my-task-summary.usecase";
import { ReassignTaskUseCase } from "./use-cases/reassign-task.usecase";
import { TaskAssigneePerformanceReportRepository } from "./repositories/task-assignee-performance-report.repository";
import { TransitionTaskUseCase } from "./use-cases/transition-task.usecase";
import { ListTaskTransitionsUseCase } from "./use-cases/list-task-transitions.usecase";
import { ListTaskNotificationsUseCase } from "./use-cases/list-task-notifications.usecase";
import { MarkTaskNotificationReadUseCase } from "./use-cases/mark-task-notification-read.usecase";
import { MarkAllTaskNotificationsReadUseCase } from "./use-cases/mark-all-task-notifications-read.usecase";
import { ListTaskDelegationsUseCase } from "./use-cases/list-task-delegations.usecase";
import { CreateTaskDelegationUseCase } from "./use-cases/create-task-delegation.usecase";
import { RevokeTaskDelegationUseCase } from "./use-cases/revoke-task-delegation.usecase";
import { StreamTaskEventsUseCase } from "./use-cases/stream-task-events.usecase";
import { ListTaskCommentsEndpointUseCase } from "./use-cases/list-task-comments-endpoint.usecase";
import { CreateTaskCommentEndpointUseCase } from "./use-cases/create-task-comment-endpoint.usecase";
import { DeleteTaskCommentEndpointUseCase } from "./use-cases/delete-task-comment-endpoint.usecase";
import { ListTaskAttachmentsEndpointUseCase } from "./use-cases/list-task-attachments-endpoint.usecase";
import { UploadTaskAttachmentEndpointUseCase } from "./use-cases/upload-task-attachment-endpoint.usecase";
import { DeleteTaskAttachmentEndpointUseCase } from "./use-cases/delete-task-attachment-endpoint.usecase";
import { ListTaskDependenciesEndpointUseCase } from "./use-cases/list-task-dependencies-endpoint.usecase";
import { AddTaskDependencyEndpointUseCase } from "./use-cases/add-task-dependency-endpoint.usecase";
import { RemoveTaskDependencyEndpointUseCase } from "./use-cases/remove-task-dependency-endpoint.usecase";
// ── Workflow engine ────────────────────────────────────────────────────────
import { WorkflowEngine } from "../../platform-workflow-engine/tasks/workflow-engine";
import { TransitionValidator } from "../../platform-workflow-engine/tasks/transition-validator";
import { CONTRACTS_TOKENS } from "../../../contracts";
import { TaskWorkflowTasksAdapter } from "../workflow/adapters/task-workflow-tasks.adapter";
import { TaskWorkflowRepository } from "../../platform-workflow-engine/tasks/repositories/task-workflow.repository";
import { WorkflowSideEffectsService } from "../../platform-workflow-engine/tasks/workflow-side-effects.service";
// ── Event system ───────────────────────────────────────────────────────────
import { TaskEventPublisher } from "../events/task-event-publisher";
import { TaskEventStoreRepository } from "../events/task-event-store.repository";
import { ConsumerIdempotencyRepository } from "../events/repositories/consumer-idempotency.repository";
import { TaskAuditLogRepository } from "../events/repositories/task-audit-log.repository";
import { TaskEventsMetricsRepository } from "../events/repositories/task-events-metrics.repository";
import { NotificationConsumer } from "../events/consumers/notification.consumer";
import { ActivityLogConsumer } from "../events/consumers/activity-log.consumer";
import { AnalyticsConsumer } from "../events/consumers/analytics.consumer";
import { OutboxDispatcherConsumer } from "../events/consumers/outbox-dispatcher.consumer";
import { OutboxMetricsService } from "../events/outbox-metrics.service";

import { FindTaskByIdUseCase } from "./use-cases/find-task-by-id.usecase";
import { ListSubtasksUseCase } from "./use-cases/list-subtasks.usecase";

@Module({
  imports: [StorageModule, MetricsModule],
  controllers: [TasksController],
  providers: [
    // ── Repository ──────────────────────────────────────────────────────────
    TasksRepository,
    TasksTransactionsRepository,
    TaskNotificationsRepository,
    TaskActivitiesRepository,
    TaskDependenciesRepository,
    TaskDelegationsRepository,
    TaskSlaRepository,
    MyTaskSummaryRepository,
    TaskAnalyticsRepository,
    TaskAssigneePerformanceReportRepository,
    TaskEmployeeHiredSubscriber,
    TaskEventStoreRepository,
    ConsumerIdempotencyRepository,
    TaskAuditLogRepository,
    TaskEventsMetricsRepository,
    // ── Services ────────────────────────────────────────────────────────────
    TaskNotificationsService,
    TaskEventsService,
    // ── Workflow engine ──────────────────────────────────────────────────────
    TaskWorkflowRepository,
    TaskWorkflowTasksAdapter,
    {
      provide: CONTRACTS_TOKENS.TASK_WORKFLOW_TASKS_PORT,
      useExisting: TaskWorkflowTasksAdapter,
    },
    TransitionValidator,
    WorkflowSideEffectsService,
    WorkflowEngine,
    // ── Event system ─────────────────────────────────────────────────────────
    TaskEventPublisher,
    NotificationConsumer,
    ActivityLogConsumer,
    AnalyticsConsumer,
    OutboxDispatcherConsumer,
    OutboxMetricsService,
    // ── Use cases ────────────────────────────────────────────────────────────
    ListTasksUseCase,
    ListMyTasksUseCase,
    CreateTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    ListTaskAssignmentsUseCase,
    ListTaskActivitiesUseCase,
    AcceptTaskUseCase,
    RejectTaskUseCase,
    SubmitTaskUseCase,
    ApproveTaskUseCase,
    ReturnTaskUseCase,
    ListTaskCommentsUseCase,
    CreateTaskCommentUseCase,
    DeleteTaskCommentUseCase,
    ListTaskAttachmentsUseCase,
    UploadTaskAttachmentUseCase,
    DeleteTaskAttachmentUseCase,
    ListTaskSubmissionsUseCase,
    BulkAssignTaskUseCase,
    TaskReminderService,
    ManageTaskDependenciesUseCase,
    ManageTaskDelegationsUseCase,
    TaskSlaService,
    TaskAnalyticsUseCase,
    MyTaskSummaryUseCase,
    ReassignTaskUseCase,
    TaskAssigneePerformanceReportUseCase,
    TransitionTaskUseCase,
    ListTaskTransitionsUseCase,
    ListTaskNotificationsUseCase,
    MarkTaskNotificationReadUseCase,
    MarkAllTaskNotificationsReadUseCase,
    ListTaskDelegationsUseCase,
    CreateTaskDelegationUseCase,
    RevokeTaskDelegationUseCase,
    StreamTaskEventsUseCase,
    ListTaskCommentsEndpointUseCase,
    CreateTaskCommentEndpointUseCase,
    DeleteTaskCommentEndpointUseCase,
    ListTaskAttachmentsEndpointUseCase,
    UploadTaskAttachmentEndpointUseCase,
    DeleteTaskAttachmentEndpointUseCase,
    ListTaskDependenciesEndpointUseCase,
    AddTaskDependencyEndpointUseCase,
    RemoveTaskDependencyEndpointUseCase,
    FindTaskByIdUseCase,
    ListSubtasksUseCase,
  ],
  exports: [
    WorkflowEngine,
    TaskEventPublisher,
    CreateTaskUseCase,
    TaskSlaService,
    TaskAnalyticsUseCase,
  ],
})
export class TasksModule {}
