import { pgEnum } from "drizzle-orm/pg-core";

export const taskStatusEnum = pgEnum("task_status_enum", [
  "created",
  "assigned",
  "in_progress",
  "declined",
  "submitted",
  "revision",
  "completed",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority_enum", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const taskActivityActionEnum = pgEnum("task_activity_action_enum", [
  "created",
  "assigned",
  "accepted",
  "declined",
  "submitted",
  "approved",
  "returned",
  "resubmitted",
  "cancelled",
  "status_changed",
  "progress_updated",
  "unassigned",
]);

export const assigneeTypeEnum = pgEnum("assignee_type_enum", [
  "employee",
  "manager",
  "hr",
  "it",
  "specific",
]);

export const taskDependencyTypeEnum = pgEnum("task_dependency_type_enum", [
  "blocks",
  "related",
]);

export const taskDomainEventTypeEnum = pgEnum("task_domain_event_type_enum", [
  "task.created",
  "task.assigned",
  "task.unassigned",
  "task.accepted",
  "task.declined",
  "task.started",
  "task.submitted",
  "task.revision_requested",
  "task.completed",
  "task.cancelled",
  "task.deleted",
  "task.comment_added",
  "task.attachment_uploaded",
  "task.overdue",
  "task.due_soon",
  "task.approval_overdue",
  "task.revision_limit_reached",
  "task.bulk_assigned",
  "task.reassigned",
]);
