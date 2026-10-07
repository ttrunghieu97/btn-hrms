import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  Sse,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  TaskEnvelopeDto,
  TaskListEnvelopeDto,
  TaskTransitionOptionsEnvelopeDto,
} from "./dto/task-response.dto";
import { Throttle } from "@nestjs/throttler";
import { SkipTransform } from "../../../shared/decorators/skip-transform.decorator";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { TaskPolicies } from "../../../core/security/policies/task.policy";
import { Task } from "../../../core/security/types/resource-entities";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";
import { createMemoryFileInterceptor, uploadPolicy } from "../../../shared/upload/upload-policy";
import { CreateTaskDto } from "./dto/create-task.dto";
import { TaskQueryDto } from "./dto/task-query.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { ListTasksUseCase } from "./use-cases/list-tasks.usecase";
import { FindTaskByIdUseCase } from "./use-cases/find-task-by-id.usecase";
import { ListSubtasksUseCase } from "./use-cases/list-subtasks.usecase";
import { MyTaskSummaryUseCase } from "./use-cases/my-task-summary.usecase";
import { ListMyTasksUseCase } from "./use-cases/list-my-tasks.usecase";
import { CreateTaskUseCase } from "./use-cases/create-task.usecase";
import { UpdateTaskUseCase } from "./use-cases/update-task.usecase";
import { DeleteTaskUseCase } from "./use-cases/delete-task.usecase";
import { ListTaskAssignmentsUseCase } from "./use-cases/list-task-assignments.usecase";
import { ListTaskActivitiesUseCase } from "./use-cases/list-task-activities.usecase";
import { AcceptTaskUseCase } from "./use-cases/accept-task.usecase";
import { RejectTaskUseCase } from "./use-cases/reject-task.usecase";
import { SubmitTaskUseCase } from "./use-cases/submit-task.usecase";
import { ApproveTaskUseCase } from "./use-cases/approve-task.usecase";
import { ReturnTaskUseCase } from "./use-cases/return-task.usecase";
import { RejectTaskDto } from "./dto/reject-task.dto";
import { SubmitTaskDto } from "./dto/submit-task.dto";
import { ReturnTaskDto } from "./dto/return-task.dto";
import { ListTaskNotificationsUseCase } from "./use-cases/list-task-notifications.usecase";
import { StreamTaskEventsUseCase } from "./use-cases/stream-task-events.usecase";
import { MarkTaskNotificationReadUseCase } from "./use-cases/mark-task-notification-read.usecase";
import { MarkAllTaskNotificationsReadUseCase } from "./use-cases/mark-all-task-notifications-read.usecase";
import { ListTaskDelegationsUseCase } from "./use-cases/list-task-delegations.usecase";
import { CreateTaskDelegationUseCase } from "./use-cases/create-task-delegation.usecase";
import { RevokeTaskDelegationUseCase } from "./use-cases/revoke-task-delegation.usecase";
import { ListTaskCommentsEndpointUseCase } from "./use-cases/list-task-comments-endpoint.usecase";
import { CreateTaskCommentEndpointUseCase } from "./use-cases/create-task-comment-endpoint.usecase";
import { DeleteTaskCommentEndpointUseCase } from "./use-cases/delete-task-comment-endpoint.usecase";
import { ListTaskAttachmentsEndpointUseCase } from "./use-cases/list-task-attachments-endpoint.usecase";
import { UploadTaskAttachmentEndpointUseCase } from "./use-cases/upload-task-attachment-endpoint.usecase";
import { DeleteTaskAttachmentEndpointUseCase } from "./use-cases/delete-task-attachment-endpoint.usecase";
import { ListTaskSubmissionsUseCase } from "./use-cases/list-task-submissions.usecase";
import { CreateTaskCommentDto } from "./dto/create-task-comment.dto";
import { BulkAssignTaskUseCase } from "./use-cases/bulk-assign-task.usecase";
import { BulkAssignTaskDto } from "./dto/bulk-assign-task.dto";
import { ListTaskDependenciesEndpointUseCase } from "./use-cases/list-task-dependencies-endpoint.usecase";
import { AddTaskDependencyEndpointUseCase } from "./use-cases/add-task-dependency-endpoint.usecase";
import { RemoveTaskDependencyEndpointUseCase } from "./use-cases/remove-task-dependency-endpoint.usecase";
import { TaskAnalyticsUseCase } from "./use-cases/task-analytics.usecase";
import { TaskAnalyticsQueryDto } from "./dto/task-analytics.dto";
import { TaskAssigneePerformanceReportQueryDto } from "./dto/task-assignee-performance-report-query.dto";
import { ReassignTaskUseCase } from "./use-cases/reassign-task.usecase";
import { ReassignTaskDto } from "./dto/reassign-task.dto";
import { TaskAssigneePerformanceReportUseCase } from "./use-cases/task-assignee-performance-report.usecase";
import { TransitionTaskDto } from "./dto/transition-task.dto";
import { TransitionTaskUseCase } from "./use-cases/transition-task.usecase";
import { ListTaskTransitionsUseCase } from "./use-cases/list-task-transitions.usecase";
import { CreateTaskDelegationDto } from "./dto/create-task-delegation.dto";
import { Idempotent } from "../../../infrastructure/idempotency/idempotency.decorator";
import { AddTaskDependencyDto } from "./dto/add-task-dependency.dto";
import type { Request as ExpressRequest } from "express";

/** Typed Express request with resolved JWT user. */
interface AuthenticatedRequest extends ExpressRequest {
  user: AuthUser;
}

const TASK_ATTACHMENT_MIME_TYPES = [
  ...uploadPolicy.mimeTypes.image,
  ...uploadPolicy.mimeTypes.document,
] as const;

@ApiTags("Tasks")
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(
    private readonly listTasks: ListTasksUseCase,
    private readonly listMyTasks: ListMyTasksUseCase,
    private readonly myTaskSummary: MyTaskSummaryUseCase,
    private readonly listTaskAssignments: ListTaskAssignmentsUseCase,
    private readonly listTaskActivities: ListTaskActivitiesUseCase,
    private readonly createTask: CreateTaskUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
    private readonly acceptTask: AcceptTaskUseCase,
    private readonly rejectTask: RejectTaskUseCase,
    private readonly submitTask: SubmitTaskUseCase,
    private readonly approveTask: ApproveTaskUseCase,
    private readonly returnTaskUseCase: ReturnTaskUseCase,
    private readonly streamTaskEventsUseCase: StreamTaskEventsUseCase,
    private readonly listTaskNotificationsUseCase: ListTaskNotificationsUseCase,
    private readonly markTaskNotificationReadUseCase: MarkTaskNotificationReadUseCase,
    private readonly markAllTaskNotificationsReadUseCase: MarkAllTaskNotificationsReadUseCase,
    private readonly listTaskDelegationsUseCase: ListTaskDelegationsUseCase,
    private readonly createTaskDelegationUseCase: CreateTaskDelegationUseCase,
    private readonly revokeTaskDelegationUseCase: RevokeTaskDelegationUseCase,
    private readonly listTaskComments: ListTaskCommentsEndpointUseCase,
    private readonly createTaskComment: CreateTaskCommentEndpointUseCase,
    private readonly deleteTaskComment: DeleteTaskCommentEndpointUseCase,
    private readonly listTaskAttachments: ListTaskAttachmentsEndpointUseCase,
    private readonly uploadTaskAttachment: UploadTaskAttachmentEndpointUseCase,
    private readonly deleteTaskAttachment: DeleteTaskAttachmentEndpointUseCase,
    private readonly listTaskSubmissions: ListTaskSubmissionsUseCase,
    private readonly bulkAssignTasks: BulkAssignTaskUseCase,
    private readonly listTaskDependenciesEndpointUseCase: ListTaskDependenciesEndpointUseCase,
    private readonly addTaskDependencyEndpointUseCase: AddTaskDependencyEndpointUseCase,
    private readonly removeTaskDependencyEndpointUseCase: RemoveTaskDependencyEndpointUseCase,
    private readonly taskAnalytics: TaskAnalyticsUseCase,
    private readonly reassignTask: ReassignTaskUseCase,
    private readonly taskAssigneePerformanceReport: TaskAssigneePerformanceReportUseCase,
    private readonly transitionTaskUseCase: TransitionTaskUseCase,
    private readonly listTaskTransitionsUseCase: ListTaskTransitionsUseCase,
    private readonly findTaskByIdUseCase: FindTaskByIdUseCase,
    private readonly listSubtasksUseCase: ListSubtasksUseCase,
  ) {}

  @Get("analytics")
  @CheckPolicy(TaskPolicies.viewAny)
  @ApiOperation({ summary: "Get task analytics aggregations" })
  async getAnalytics(@Query() query: TaskAnalyticsQueryDto) {
    return this.taskAnalytics.execute(query);
  }

  @Get("reports/assignee-performance")
  @CheckPolicy(TaskPolicies.viewAny)
  @ApiOperation({
    summary: "Get assignee performance report for task assignment tracking",
  })
  async getAssigneePerformanceReport(@Query() query: TaskAssigneePerformanceReportQueryDto) {
    return this.taskAssigneePerformanceReport.execute(query);
  }

  @Get()
  @CheckPolicy(TaskPolicies.viewAny)
  @ApiOperation({ summary: "List tasks (pagination, search, status filter)" })
  @ApiOkResponse({ type: TaskListEnvelopeDto })
  async list(@Query() query: TaskQueryDto) {
    return this.listTasks.execute(query);
  }

  @Get("me/summary")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "Get summary counts for current user's tasks" })
  async mySummary(@Request() req: AuthenticatedRequest) {
    return { data: await this.myTaskSummary.execute(req.user.employeeId ?? null) };
  }

  @Get("me")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List tasks assigned to current user" })
  @ApiOkResponse({ type: TaskListEnvelopeDto })
  async listMine(@Query() query: TaskQueryDto, @Request() req: AuthenticatedRequest) {
    return this.listMyTasks.execute(query, req.user.employeeId ?? null);
  }

  @Get("delegations")
  @CheckPolicy(TaskPolicies.manage)
  @ApiOperation({ summary: "List active task delegations for current user" })
  async listDelegations(@Request() req: AuthenticatedRequest) {
    return this.listTaskDelegationsUseCase.execute(req.user.id);
  }

  @Post("delegations")
  @CheckPolicy(TaskPolicies.manage)
  @AuditLog({ action: "task_delegation_create", entity: "task_delegation" })
  @ApiOperation({ summary: "Create a task delegation" })
  async createDelegation(
    @Body() dto: CreateTaskDelegationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.createTaskDelegationUseCase.execute(dto, req.user.id, req.user);
  }

  @Delete("delegations/:id")
  @CheckPolicy(TaskPolicies.manage)
  @AuditLog({ action: "task_delegation_revoke", entity: "task_delegation" })
  @ApiOperation({ summary: "Revoke a task delegation" })
  async revokeDelegation(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.revokeTaskDelegationUseCase.execute(id, req.user.id);
  }

  @Get("notifications")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List task notifications for current user" })
  async listNotifications(@Request() req: AuthenticatedRequest) {
    return this.listTaskNotificationsUseCase.execute(req.user.id);
  }

  @Patch("notifications/:id/read")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "Mark a notification as read" })
  async markNotificationRead(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.markTaskNotificationReadUseCase.execute(req.user.id, id);
  }

  @Patch("notifications/read-all")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllNotificationsRead(@Request() req: AuthenticatedRequest) {
    return this.markAllTaskNotificationsReadUseCase.execute(req.user.id);
  }

  @Get(":id")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "Get task details by ID" })
  @ApiOkResponse({ type: TaskEnvelopeDto })
  async findById(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.findTaskByIdUseCase.execute(id);
  }

  @Get(":id/subtasks")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List subtasks under a parent task" })
  @ApiOkResponse({ type: TaskListEnvelopeDto })
  async listSubtasks(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.listSubtasksUseCase.execute(id);
  }

  @Get(":id/assignments")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List task assignment history" })
  async listAssignments(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.listTaskAssignments.execute(id);
  }

  @Get(":id/activities")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List task activity history" })
  async listActivities(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.listTaskActivities.execute(id);
  }

  @Post()
  @CheckPolicy(TaskPolicies.create)
  @AuditLog({ action: "task_create", entity: "task" })
  @ApiOperation({ summary: "Create a new task (optionally assign)" })
  @ApiOkResponse({ type: TaskEnvelopeDto })
  async create(@Body() dto: CreateTaskDto, @Request() req: AuthenticatedRequest) {
    return this.createTask.execute(dto, req.user.id);
  }

  @Patch(":id")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @AuditLog({ action: "task_update", entity: "task" })
  @ApiOperation({ summary: "Update task details (non-workflow fields only)" })
  @ApiOkResponse({ type: TaskEnvelopeDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.updateTask.execute(id, dto, req.user);
  }

  @Patch(":id/accept")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @AuditLog({ action: "task_accept", entity: "task" })
  @Idempotent("PATCH:/tasks/:id/accept")
  @ApiOperation({ summary: "Accept a task" })
  async accept(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.acceptTask.execute(id, req.user);
  }

  @Patch(":id/reject")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @AuditLog({ action: "task_reject", entity: "task" })
  @Idempotent("PATCH:/tasks/:id/reject")
  @ApiOperation({ summary: "Reject a task" })
  async reject(
    @Param("id") id: string,
    @Body() dto: RejectTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rejectTask.execute(id, dto, req.user);
  }

  @Post(":id/submit")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @AuditLog({ action: "task_submit", entity: "task" })
  @Idempotent("POST:/tasks/:id/submit")
  @ApiOperation({ summary: "Submit a task" })
  async submit(
    @Param("id") id: string,
    @Body() dto: SubmitTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.submitTask.execute(id, dto, req.user);
  }

  @Post(":id/approve")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.manage)
  @AuditLog({ action: "task_approve", entity: "task" })
  @Idempotent("POST:/tasks/:id/approve")
  @ApiOperation({ summary: "Approve a task" })
  async approve(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.approveTask.execute(id, req.user);
  }

  @Post(":id/return")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.manage)
  @AuditLog({ action: "task_return", entity: "task" })
  @Idempotent("POST:/tasks/:id/return")
  @ApiOperation({ summary: "Return a task for revision" })
  async returnTask(
    @Param("id") id: string,
    @Body() dto: ReturnTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.returnTaskUseCase.execute(id, dto, req.user);
  }

  @Post(":id/transitions")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @AuditLog({ action: "task_transition", entity: "task" })
  @Idempotent("POST:/tasks/:id/transitions")
  @ApiOperation({ summary: "Run a workflow transition on a task" })
  async transitionTask(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: TransitionTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.transitionTaskUseCase.execute(id, dto, req.user);
  }

  @Get(":id/transitions")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List available workflow transitions for a task" })
  @ApiOkResponse({ type: TaskTransitionOptionsEnvelopeDto })
  async listTransitions(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const options = await this.listTaskTransitionsUseCase.execute(id, req.user);
    return { data: options };
  }

  @Post(":id/reassign")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.manage)
  @AuditLog({ action: "task_reassign", entity: "task" })
  @ApiOperation({ summary: "Reassign task to another employee (status unchanged)" })
  async reassign(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ReassignTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reassignTask.execute(id, dto, req.user);
  }

  @Delete(":id")
  @CheckPolicy(TaskPolicies.delete)
  @AuditLog({ action: "task_delete", entity: "task" })
  @ApiOperation({ summary: "Delete a task" })
  async remove(@Param("id") id: string) {
    return this.deleteTask.execute(id);
  }

  @Post("bulk-assign")
  @CheckPolicy(TaskPolicies.manage)
  @ApiOperation({ summary: "Bulk assign tasks" })
  async bulkAssign(@Body() dto: BulkAssignTaskDto, @Request() req: AuthenticatedRequest) {
    return this.bulkAssignTasks.execute(dto, req.user);
  }

  @Get(":id/dependencies")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List task dependencies" })
  async listDependencies(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.listTaskDependenciesEndpointUseCase.execute(id);
  }

  @Post(":id/dependencies")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @ApiOperation({ summary: "Add task dependency" })
  async addDependency(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AddTaskDependencyDto,
  ) {
    return this.addTaskDependencyEndpointUseCase.execute(id, dto);
  }

  @Delete(":id/dependencies/:dependsOnTaskId")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @ApiOperation({ summary: "Remove task dependency" })
  async removeDependency(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("dependsOnTaskId", new ParseUUIDPipe()) dependsOnTaskId: string,
  ) {
    return this.removeTaskDependencyEndpointUseCase.execute(id, dependsOnTaskId);
  }

  @Get(":id/comments")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List task comments" })
  async listComments(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.listTaskComments.execute(id);
  }

  @Post(":id/comments")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @ApiOperation({ summary: "Create task comment" })
  async createComment(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CreateTaskCommentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.createTaskComment.execute(id, dto, req.user);
  }

  @Delete(":id/comments/:commentId")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @ApiOperation({ summary: "Delete task comment" })
  async removeComment(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("commentId", new ParseUUIDPipe()) commentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.deleteTaskComment.execute(id, commentId, req.user);
  }

  @Get(":id/attachments")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List task attachments" })
  async listAttachments(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.listTaskAttachments.execute(id);
  }

  @Post(":id/attachments/upload")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @UseInterceptors(createMemoryFileInterceptor("file", TASK_ATTACHMENT_MIME_TYPES))
  @ApiOperation({ summary: "Upload task attachment" })
  async uploadAttachment(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.uploadTaskAttachment.execute(id, file, req.user);
  }

  @Delete(":id/attachments/:attachmentId")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.update)
  @ApiOperation({ summary: "Delete task attachment" })
  async removeAttachment(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("attachmentId", new ParseUUIDPipe()) attachmentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.deleteTaskAttachment.execute(id, attachmentId, req.user);
  }

  @Get(":id/submissions")
  @Resource(Task, "id")
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "List task submission history" })
  async listSubmissions(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.listTaskSubmissions.execute(id);
  }



  @Sse("events/stream")
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  @SkipTransform()
  @CheckPolicy(TaskPolicies.viewOwn)
  @ApiOperation({ summary: "Stream task realtime events (SSE)" })
  async streamTaskEvents(@Request() req: AuthenticatedRequest) {
    return this.streamTaskEventsUseCase.execute(req.user, req);
  }
}
