import { Injectable } from "@nestjs/common";
import {
  type TaskWorkflowTasksPort,
  type TaskWorkflowTransaction,
  type WorkflowTaskActivity,
  type WorkflowTaskPatch,
  type WorkflowTaskNotification,
  type WorkflowTaskStatus,
  type WorkflowTaskSubmission,
} from "../../../../contracts";
import {
  type AppDatabase,
  type AppTransaction,
} from "../../../../infrastructure/database/database-client.type";
import { TasksRepository } from "../../tasks/repositories/tasks.repository";
import { TaskNotificationsService } from "../../tasks/notifications/task-notifications.service";

@Injectable()
export class TaskWorkflowTasksAdapter implements TaskWorkflowTasksPort {
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly notifications: TaskNotificationsService,
  ) {}

  findById(taskId: string) {
    return this.tasksRepo.findById(taskId);
  }

  updateWithOptimisticLock(
    taskId: string,
    expectedStatus: WorkflowTaskStatus,
    patch: WorkflowTaskPatch,
    db?: TaskWorkflowTransaction,
  ) {
    return this.tasksRepo.updateWithOptimisticLock(
      taskId,
      expectedStatus,
      patch,
      this.toExecutor(db),
    );
  }

  async addActivity(
    activity: WorkflowTaskActivity,
    db?: TaskWorkflowTransaction,
  ) {
    await this.tasksRepo.addActivity(activity, this.toExecutor(db));
  }

  async addAssignment(
    taskId: string,
    assigneeEmployeeId: string,
    actorUserId: string | null,
    db?: TaskWorkflowTransaction,
  ) {
    await this.tasksRepo.addAssignment(
      taskId,
      assigneeEmployeeId,
      actorUserId,
      this.toExecutor(db),
    );
  }

  getUserIdByEmployeeId(
    employeeId: string,
    db?: TaskWorkflowTransaction,
  ) {
    return this.tasksRepo.getUserIdByEmployeeId(
      employeeId,
      this.toExecutor(db),
    );
  }

  getNextSubmissionVersion(
    taskId: string,
    db?: TaskWorkflowTransaction,
  ) {
    return this.tasksRepo.getNextSubmissionVersion(
      taskId,
      this.toExecutor(db),
    );
  }

  async addSubmission(
    payload: WorkflowTaskSubmission,
    db?: TaskWorkflowTransaction,
  ) {
    await this.tasksRepo.addSubmission(payload, this.toExecutor(db));
  }

  async update(
    taskId: string,
    patch: WorkflowTaskPatch,
    db?: TaskWorkflowTransaction,
  ) {
    await this.tasksRepo.update(taskId, patch, this.toExecutor(db));
  }

  async createNotification(
    notification: WorkflowTaskNotification,
    db?: TaskWorkflowTransaction,
  ) {
    await this.notifications.create(notification, this.toExecutor(db));
  }

  private toExecutor(
    db?: TaskWorkflowTransaction,
  ): AppDatabase | AppTransaction | undefined {
    return db as AppDatabase | AppTransaction | undefined;
  }
}
