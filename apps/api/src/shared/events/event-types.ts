import { registerEvent } from "./event-registry";

/**
 * Bootstrap workforce event types.
 * Call once at application startup (e.g. in AppModule.onModuleInit).
 */
export function registerWorkforceEvents(): void {
  // ─── Attendance Checked ───────────────────────────────────────────
  registerEvent({
    type: "AttendanceCheckedEvent",
    version: 1,
    description: "Emitted when an attendance record is created (check-in/out/break)",
    producer: "CheckAttendanceUseCase",
    requiredFields: ["employeeId", "type", "date"],
    strict: true,
  });

  // ─── Employee Status Changed ──────────────────────────────────────
  registerEvent({
    type: "employee.status-changed",
    version: 1,
    description: "Emitted when employee lifecycle status changes (leave, suspended, retired, working, probation)",
    producer: "EmployeeLifecycleService.changeStatus",
    requiredFields: ["employeeId", "fromStatus", "toStatus", "changedByUserId", "effectiveDate", "reason"],
    strict: true,
  });

  // ─── Employee Terminated (immediate) ──────────────────────────────
  registerEvent({
    type: "employee.terminated",
    version: 1,
    description: "Emitted when an employee is terminated (immediate or scheduled execution)",
    producer: "TerminateEmployeeUseCase / ExecuteScheduledTerminationsUseCase",
    requiredFields: ["employeeId", "effectiveDate", "reason"],
    strict: true,
  });

  // ─── Employee Rehired ─────────────────────────────────────────────
  registerEvent({
    type: "employee.rehired",
    version: 1,
    description: "Emitted when a terminated employee is rehired with a new employment cycle",
    producer: "RehireEmployeeUseCase",
    requiredFields: ["employeeId", "hireDate", "status", "newEmploymentRecordId"],
    strict: true,
  });

  // ─── Employee Transfer Requested ──────────────────────────────────
  registerEvent({
    type: "employee.transfer-requested",
    version: 1,
    description: "Emitted when a transfer request is submitted and workflow started",
    producer: "RequestTransferUseCase",
    requiredFields: ["employeeId", "toDepartmentId", "effectiveDate", "workflowInstanceId"],
    strict: true,
  });

  // ─── Employee Transfer Applied ────────────────────────────────────
  registerEvent({
    type: "employee.transfer-applied",
    version: 1,
    description: "Emitted when an approved transfer is applied (org assignment changed)",
    producer: "ApplyTransferUseCase",
    requiredFields: ["employeeId", "effectiveDate", "toDepartmentId", "workflowInstanceId"],
    strict: true,
  });

  // ─── Employee Termination Scheduled ───────────────────────────────
  registerEvent({
    type: "employee.termination-scheduled",
    version: 1,
    description: "Emitted when a future-dated termination is scheduled",
    producer: "ScheduleTerminationUseCase",
    requiredFields: ["employeeId", "effectiveDate", "workflowInstanceId"],
    strict: true,
  });

  // ─── Employee Termination Executed ────────────────────────────────
  registerEvent({
    type: "employee.termination-executed",
    version: 1,
    description: "Emitted when a scheduled termination is executed by the cron worker",
    producer: "ExecuteScheduledTerminationsUseCase",
    requiredFields: ["employeeId", "effectiveDate", "workflowInstanceId"],
    strict: true,
  });

  // ─── Employee Hired ───────────────────────────────────────────────
  registerEvent({
    type: "employee.hired",
    version: 1,
    description: "Emitted when a new employee is created/hired",
    producer: "CreateEmployeeUseCase / HireEmployeeUseCase",
    requiredFields: ["scopeId", "employeeId", "userId", "hiredByUserId"],
    strict: true,
  });

  // ─── Employee Created ─────────────────────────────────────────────
  registerEvent({
    type: "employee.created",
    version: 1,
    description: "Emitted when employee record is initially created",
    producer: "CreateEmployeeUseCase",
    requiredFields: ["employeeId"],
    strict: true,
  });
}

export function registerSchedulingEvents(): void {
  // ─── Assignment Created ──────────────────────────────────────────
  registerEvent({
    type: "schedule.assignment.created",
    version: 1,
    description: "Emitted when a shift assignment is created",
    producer: "CreateEmployeeShiftAssignmentUseCase",
    requiredFields: ["assignmentId", "employeeId", "shiftTemplateId", "effectiveFrom", "effectiveTo"],
    strict: true,
  });

  // ─── Assignment Cancelled ─────────────────────────────────────────
  registerEvent({
    type: "schedule.assignment.cancelled",
    version: 1,
    description: "Emitted when a shift assignment is cancelled",
    producer: "CancelEmployeeShiftAssignmentUseCase",
    requiredFields: ["assignmentId", "employeeId"],
    strict: true,
  });

  // ─── Roster Submitted ─────────────────────────────────────────────
  registerEvent({
    type: "schedule.roster.submitted",
    version: 1,
    description: "Emitted when a roster is submitted for approval",
    producer: "SubmitShiftRosterForApprovalUseCase",
    requiredFields: ["branchId", "departmentId", "periodStart", "periodEnd", "submittedByUserId"],
    strict: true,
  });

  // ─── Roster Approved ──────────────────────────────────────────────
  registerEvent({
    type: "schedule.roster.approved",
    version: 1,
    description: "Emitted when a roster is approved",
    producer: "ApproveShiftRosterUseCase",
    requiredFields: ["branchId", "departmentId", "periodStart", "periodEnd", "approvedByUserId"],
    strict: true,
  });

  // ─── Roster Rejected ──────────────────────────────────────────────
  registerEvent({
    type: "schedule.roster.rejected",
    version: 1,
    description: "Emitted when a roster is rejected",
    producer: "RejectShiftRosterUseCase",
    requiredFields: ["branchId", "departmentId", "periodStart", "periodEnd", "rejectedByUserId", "reason"],
    strict: true,
  });

  // ─── Roster Published ─────────────────────────────────────────────
  registerEvent({
    type: "schedule.roster.published",
    version: 1,
    description: "Emitted when a roster is published and locked",
    producer: "PublishShiftRosterUseCase",
    requiredFields: ["branchId", "departmentId", "periodStart", "periodEnd", "publishedByUserId"],
    strict: true,
  });
}

export function registerLeaveEvents(): void {
  // ─── Leave Approval Requested ──────────────────────────────────────
  registerEvent({
    type: "leave.approval.requested",
    version: 1,
    description: "Emitted when a leave request requires approval workflow",
    producer: "CreateLeaveRequestUseCase",
    requiredFields: ["idempotencyKey", "leaveRequestId", "employeeId", "leaveTypeId", "requestedAt"],
    strict: true,
  });

  // ─── Leave Cancellation Requested ──────────────────────────────────
  registerEvent({
    type: "leave.cancellation.requested",
    version: 1,
    description: "Emitted when a pending leave request cancellation needs engine sync",
    producer: "CancelLeaveRequestUseCase",
    requiredFields: ["idempotencyKey", "leaveRequestId", "cancelledByUserId"],
    strict: true,
  });

  // ─── Leave Approved ────────────────────────────────────────────────
  registerEvent({
    type: "leave.approved",
    version: 1,
    description: "Emitted when a leave request is approved (by engine or auto)",
    producer: "LeaveDecisionHandler",
    requiredFields: ["idempotencyKey", "leaveRequestId", "employeeId", "approvedAt"],
    strict: true,
  });

  // ─── Leave Rejected ────────────────────────────────────────────────
  registerEvent({
    type: "leave.rejected",
    version: 1,
    description: "Emitted when a leave request is rejected",
    producer: "LeaveDecisionHandler",
    requiredFields: ["idempotencyKey", "leaveRequestId", "employeeId", "rejectedAt"],
    strict: true,
  });

  // ─── Approval Request Decided ──────────────────────────────────────
  registerEvent({
    type: "approval.request.decided",
    version: 1,
    description: "Emitted by approval engine when a step chain resolves",
    producer: "PlatformApprovalEngineService",
    requiredFields: ["idempotencyKey", "approvalRequestId", "subjectType", "subjectId", "decision", "decidedAt"],
    strict: true,
  });
}

export function registerPayrollEvents(): void {
  registerEvent({
    type: "payroll.run.processed",
    version: 1,
    description: "Emitted when a payroll run is generated and ready for approval",
    producer: "GeneratePayrollRunUseCase",
    requiredFields: ["payrollRunId"],
    strict: true,
  });
}

export function registerRecruitmentEvents(): void {
  // ─── Requisition Approval Requested ────────────────────────────────
  registerEvent({
    type: "recruitment.requisition.approval.requested",
    version: 1,
    description: "Emitted when a job requisition is submitted for approval",
    producer: "SubmitRequisitionUseCase",
    requiredFields: [
      "idempotencyKey",
      "requisitionId",
      "departmentId",
      "requestedAt",
    ],
    strict: true,
  });

  // ─── Offer Approval Requested ──────────────────────────────────────
  registerEvent({
    type: "recruitment.offer.approval.requested",
    version: 1,
    description: "Emitted when an offer is submitted for approval",
    producer: "SubmitOfferUseCase",
    requiredFields: [
      "idempotencyKey",
      "offerId",
      "applicationId",
      "requestedAt",
    ],
    strict: true,
  });

  // ─── Candidate Hired ───────────────────────────────────────────────
  registerEvent({
    type: "recruitment.candidate.hired",
    version: 1,
    description:
      "Emitted when a candidate accepts an approved offer; hand-off to onboarding/workforce",
    producer: "DecideOfferUseCase",
    requiredFields: [
      "idempotencyKey",
      "offerId",
      "applicationId",
      "candidateId",
      "hiredAt",
    ],
    strict: true,
  });
}

export function registerApprovalEvents(): void {
  // ─── Approval Request Created ───────────────────────────────────────
  registerEvent({
    type: "approval.request.created",
    version: 1,
    description: "Emitted when a new approval request is submitted",
    producer: "RequestApprovalUseCase",
    requiredFields: ["idempotencyKey", "approvalRequestId", "policyId", "subjectType", "subjectId", "requestedAt"],
    strict: true,
  });

  // ─── Approval Request Completed ────────────────────────────────────
  registerEvent({
    type: "approval.request.completed",
    version: 1,
    description: "Emitted when an approval request reaches a terminal state",
    producer: "DecideApprovalStepUseCase / CancelApprovalUseCase",
    requiredFields: ["idempotencyKey", "approvalRequestId", "subjectType", "subjectId", "outcome", "completedAt"],
    strict: true,
  });
}

export function registerAssetEvents(): void {
  // ─── Asset Request Approval Requested ──────────────────────────────
  registerEvent({
    type: "asset.request.approval.requested",
    version: 1,
    description: "Emitted when an asset request is submitted for approval",
    producer: "SubmitAssetRequestUseCase",
    requiredFields: [
      "idempotencyKey",
      "requestId",
      "requesterEmployeeId",
      "requestedAt",
    ],
    strict: true,
  });

  // ─── Asset Assigned ────────────────────────────────────────────────
  registerEvent({
    type: "asset.assigned",
    version: 1,
    description: "Emitted when assets are issued to an employee",
    producer: "IssueAssetUseCase",
    requiredFields: ["idempotencyKey", "issueId", "employeeId", "issuedAt"],
    strict: true,
  });

  // ─── Asset Returned ────────────────────────────────────────────────
  registerEvent({
    type: "asset.returned",
    version: 1,
    description: "Emitted when issued assets are returned",
    producer: "ReturnAssetUseCase",
    requiredFields: ["idempotencyKey", "issueId", "employeeId", "returnedAt"],
    strict: true,
  });
}

export function registerTasksEvents(): void {
  registerEvent({
    type: "task.created",
    version: 1,
    description: "Emitted when a task is created",
    producer: "CreateTaskUseCase",
    requiredFields: ["taskId", "assigneeEmployeeId"],
    strict: false,
  });

  registerEvent({
    type: "task.completed",
    version: 1,
    description: "Emitted when a task is completed",
    producer: "ApproveTaskUseCase",
    requiredFields: ["taskId", "previousStatus", "nextStatus"],
    strict: false,
  });

  registerEvent({
    type: "task.reassigned",
    version: 1,
    description: "Emitted when a task is reassigned",
    producer: "ReassignTaskUseCase",
    requiredFields: ["taskId", "oldAssigneeId", "newAssigneeId", "reason"],
    strict: false,
  });

  registerEvent({
    type: "task.revision_requested",
    version: 1,
    description: "Emitted when a task is returned for revision",
    producer: "ReturnTaskUseCase",
    requiredFields: ["taskId", "reason", "previousStatus", "nextStatus"],
    strict: false,
  });
}

export function registerOnboardingEvents(): void {
  registerEvent({
    type: "onboarding.process.created",
    version: 1,
    description: "Emitted when an onboarding process is created with its checklist items",
    producer: "CreateOnboardingProcessUseCase",
    requiredFields: ["processId", "employeeId", "templateId"],
    strict: false,
  });
}
export function registerOffboardingEvents(): void {
  registerEvent({
    type: "offboarding.started",
    version: 1,
    description: "Emitted when an offboarding process is auto-started via EmployeeTerminatedEvent subscription",
    producer: "StartOffboardingUseCase",
    requiredFields: ["processId", "employeeId", "templateId"],
    strict: false,
  });
  registerEvent({
    type: "offboarding.completed",
    version: 1,
    description: "Emitted when an offboarding process completes (all clearances approved, mandatory items done)",
    producer: "CompleteProcessUseCase",
    requiredFields: ["processId", "employeeId"],
    strict: false,
  });
}
