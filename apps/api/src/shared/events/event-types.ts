import {
  registerEvent,
  getEventDefinition,
  type EventDefinition,
} from "./event-registry";

function safeRegister(def: EventDefinition): void {
  if (!getEventDefinition(def.type, def.version)) {
    registerEvent(def);
  }
}

/**
 * Bootstrap workforce event types.
 * Call once at application startup (e.g. in AppModule.onModuleInit).
 */
export function registerWorkforceEvents(): void {
  // ─── Attendance Checked ───────────────────────────────────────────
  safeRegister({
    type: "AttendanceCheckedEvent",
    version: 1,
    description: "Emitted when an attendance record is created (check-in/out/break)",
    producer: "CheckAttendanceUseCase",
    requiredFields: ["employeeId", "type", "date"],
    strict: true,
  });

  // ─── Employee Status Changed ──────────────────────────────────────
  safeRegister({
    type: "employee.status-changed",
    version: 1,
    description: "Emitted when employee lifecycle status changes (leave, suspended, retired, working, probation)",
    producer: "EmployeeLifecycleService.changeStatus",
    requiredFields: ["employeeId", "fromStatus", "toStatus", "effectiveDate"],
    optionalFields: ["changedByUserId", "reason"],
    strict: true,
  });

  // ─── Employee Terminated (immediate) ──────────────────────────────
  safeRegister({
    type: "employee.terminated",
    version: 1,
    description: "Emitted when an employee is terminated (immediate or scheduled execution)",
    producer: "TerminateEmployeeUseCase / ExecuteScheduledTerminationsUseCase",
    requiredFields: ["employeeId", "effectiveDate"],
    optionalFields: ["terminatedByUserId", "reason"],
    strict: false,
  });

  // ─── Employee Rehired ─────────────────────────────────────────────
  safeRegister({
    type: "employee.rehired",
    version: 1,
    description: "Emitted when a terminated employee is rehired with a new employment cycle",
    producer: "RehireEmployeeUseCase",
    requiredFields: ["employeeId", "hireDate", "status", "newEmploymentRecordId"],
    optionalFields: ["rehiredByUserId", "departmentId", "positionId"],
    strict: true,
  });

  // ─── Employee Transfer Requested ──────────────────────────────────
  safeRegister({
    type: "employee.transfer-requested",
    version: 1,
    description: "Emitted when a transfer request is submitted and workflow started",
    producer: "RequestTransferUseCase",
    requiredFields: ["employeeId", "toDepartmentId", "effectiveDate", "workflowInstanceId"],
    optionalFields: ["requestedByUserId", "toPositionId", "toManagerEmployeeId", "reason"],
    strict: true,
  });

  // ─── Employee Transfer Approved ───────────────────────────────────
  safeRegister({
    type: "employee.transfer-approved",
    version: 1,
    description: "Emitted when a transfer request receives final HR approval",
    producer: "ApproveTransferUseCase",
    requiredFields: ["employeeId", "workflowInstanceId", "effectiveDate"],
    optionalFields: ["approvedByUserId"],
    strict: true,
  });

  // ─── Employee Transfer Cancelled ──────────────────────────────────
  safeRegister({
    type: "employee.transfer-cancelled",
    version: 1,
    description: "Emitted when a transfer request is cancelled or rejected",
    producer: "CancelTransferUseCase / RejectTransferUseCase",
    requiredFields: ["employeeId", "workflowInstanceId"],
    optionalFields: ["cancelledByUserId", "reason"],
    strict: true,
  });

  // ─── Employee Transfer Applied ────────────────────────────────────
  safeRegister({
    type: "employee.transfer-applied",
    version: 1,
    description: "Emitted when an approved transfer is applied (org assignment changed)",
    producer: "ApplyTransferUseCase",
    requiredFields: ["employeeId", "effectiveDate", "toDepartmentId", "workflowInstanceId"],
    optionalFields: ["appliedByUserId", "fromOrgAssignmentId", "toOrgAssignmentId"],
    strict: true,
  });

  // ─── Employee Termination Scheduled ───────────────────────────────
  safeRegister({
    type: "employee.termination-scheduled",
    version: 1,
    description: "Emitted when a future-dated termination is scheduled",
    producer: "ScheduleTerminationUseCase",
    requiredFields: ["employeeId", "effectiveDate", "workflowInstanceId"],
    optionalFields: ["scheduledByUserId", "reason", "lastWorkingDate"],
    strict: true,
  });

  // ─── Employee Termination Cancelled ───────────────────────────────
  safeRegister({
    type: "employee.termination-cancelled",
    version: 1,
    description: "Emitted when a scheduled termination is cancelled",
    producer: "CancelScheduledTerminationUseCase",
    requiredFields: ["employeeId", "workflowInstanceId"],
    optionalFields: ["cancelledByUserId", "reason"],
    strict: true,
  });

  // ─── Employee Termination Executed ────────────────────────────────
  safeRegister({
    type: "employee.termination-executed",
    version: 1,
    description: "Emitted when a scheduled termination is executed by the cron worker",
    producer: "ExecuteScheduledTerminationsUseCase",
    requiredFields: ["employeeId", "effectiveDate", "workflowInstanceId"],
    optionalFields: ["reason", "lastWorkingDate"],
    strict: true,
  });

  // ─── Employee Hired ───────────────────────────────────────────────
  safeRegister({
    type: "employee.hired",
    version: 1,
    description: "Emitted when a new employee is created/hired",
    producer: "CreateEmployeeUseCase / RehireEmployeeUseCase",
    requiredFields: ["scopeId", "employeeId", "userId"],
    optionalFields: ["hiredByUserId"],
    strict: true,
  });

  // ─── Employee Onboarded ───────────────────────────────────────────
  safeRegister({
    type: "employee.onboarded",
    version: 1,
    description: "Emitted when employee onboarding completes",
    producer: "OnboardingService",
    requiredFields: ["scopeId", "employeeId", "userId"],
    optionalFields: ["completedByUserId"],
    strict: true,
  });

  // ─── Employee Created ─────────────────────────────────────────────
  safeRegister({
    type: "employee.created",
    version: 1,
    description: "Emitted when employee record is initially created",
    producer: "CreateEmployeeUseCase",
    requiredFields: ["employeeId"],
    strict: true,
  });

  // ─── Organization Events ──────────────────────────────────────────
  safeRegister({
    type: "department.moved",
    version: 1,
    description: "Emitted when a department is moved in the org hierarchy",
    producer: "MoveDepartmentWithEventUseCase",
    requiredFields: ["departmentId", "effectiveDate"],
    optionalFields: ["oldParentId", "newParentId"],
    strict: true,
  });

  safeRegister({
    type: "position.created",
    version: 1,
    description: "Emitted when an org position is created",
    producer: "CreatePositionUseCase",
    requiredFields: ["positionId", "title"],
    optionalFields: ["departmentId"],
    strict: true,
  });

  safeRegister({
    type: "position.reclassified",
    version: 1,
    description: "Emitted when a position grade or department is reclassified",
    producer: "UpdatePositionUseCase",
    requiredFields: ["positionId", "effectiveDate"],
    optionalFields: ["oldGradeId", "newGradeId", "oldDepartmentId", "newDepartmentId"],
    strict: true,
  });
}

export function registerSchedulingEvents(): void {
  // ─── Assignment Created ──────────────────────────────────────────
  safeRegister({
    type: "schedule.assignment.created",
    version: 1,
    description: "Emitted when a shift assignment is created",
    producer: "CreateEmployeeShiftAssignmentUseCase",
    requiredFields: ["assignmentId", "employeeId", "shiftTemplateId", "effectiveFrom"],
    optionalFields: ["effectiveTo"],
    strict: true,
  });

  // ─── Assignment Cancelled ─────────────────────────────────────────
  safeRegister({
    type: "schedule.assignment.cancelled",
    version: 1,
    description: "Emitted when a shift assignment is cancelled",
    producer: "CancelEmployeeShiftAssignmentUseCase",
    requiredFields: ["assignmentId", "employeeId"],
    optionalFields: ["reason"],
    strict: true,
  });

  // ─── Roster Submitted ─────────────────────────────────────────────
  safeRegister({
    type: "schedule.roster.submitted",
    version: 1,
    description: "Emitted when a roster is submitted for approval",
    producer: "SubmitShiftRosterForApprovalUseCase",
    requiredFields: ["periodStart", "periodEnd", "submittedByUserId"],
    optionalFields: ["branchId", "departmentId"],
    strict: true,
  });

  // ─── Roster Approved ──────────────────────────────────────────────
  safeRegister({
    type: "schedule.roster.approved",
    version: 1,
    description: "Emitted when a roster is approved",
    producer: "ApproveShiftRosterUseCase",
    requiredFields: ["periodStart", "periodEnd", "approvedByUserId"],
    optionalFields: ["branchId", "departmentId"],
    strict: true,
  });

  // ─── Roster Rejected ──────────────────────────────────────────────
  safeRegister({
    type: "schedule.roster.rejected",
    version: 1,
    description: "Emitted when a roster is rejected",
    producer: "RejectShiftRosterUseCase",
    requiredFields: ["periodStart", "periodEnd", "rejectedByUserId", "reason"],
    optionalFields: ["branchId", "departmentId"],
    strict: true,
  });

  // ─── Roster Published ─────────────────────────────────────────────
  safeRegister({
    type: "schedule.roster.published",
    version: 1,
    description: "Emitted when a roster is published and locked",
    producer: "PublishShiftRosterUseCase",
    requiredFields: ["periodStart", "periodEnd", "publishedByUserId"],
    optionalFields: ["branchId", "departmentId"],
    strict: true,
  });

  // ─── Schedule Requests ────────────────────────────────────────────
  safeRegister({
    type: "scheduling.request.approved",
    version: 1,
    description: "Emitted when a schedule request is approved",
    producer: "ReviewScheduleRequestUseCase",
    requiredFields: ["requestId", "employeeId", "reviewerId", "reviewedAt"],
    strict: true,
  });

  safeRegister({
    type: "scheduling.request.denied",
    version: 1,
    description: "Emitted when a schedule request is denied",
    producer: "ReviewScheduleRequestUseCase",
    requiredFields: ["requestId", "employeeId", "reviewerId", "reviewedAt"],
    strict: true,
  });
}

export function registerLeaveEvents(): void {
  // ─── Leave Approval Requested ──────────────────────────────────────
  safeRegister({
    type: "leave.approval.requested",
    version: 1,
    description: "Emitted when a leave request requires approval workflow",
    producer: "CreateLeaveRequestUseCase",
    requiredFields: ["idempotencyKey", "leaveRequestId", "employeeId", "leaveTypeId", "requestedAt"],
    optionalFields: ["requestedByUserId"],
    strict: true,
  });

  // ─── Leave Cancellation Requested ──────────────────────────────────
  safeRegister({
    type: "leave.cancellation.requested",
    version: 1,
    description: "Emitted when a pending leave request cancellation needs engine sync",
    producer: "CancelLeaveRequestUseCase",
    requiredFields: ["idempotencyKey", "leaveRequestId"],
    optionalFields: ["cancelledByUserId", "cancelledAt"],
    strict: true,
  });

  // ─── Leave Request Cancelled ───────────────────────────────────────
  safeRegister({
    type: "leave.request.cancelled",
    version: 1,
    description: "Emitted when a leave request is cancelled",
    producer: "CancelLeaveRequestUseCase",
    requiredFields: ["leaveRequestId", "employeeId"],
    strict: false,
  });

  // ─── Leave Approved ────────────────────────────────────────────────
  safeRegister({
    type: "leave.approved",
    version: 1,
    description: "Emitted when a leave request is approved (by engine or auto)",
    producer: "LeaveDecisionHandler",
    requiredFields: ["idempotencyKey", "leaveRequestId", "employeeId", "approvedAt"],
    optionalFields: ["approvedByUserId", "autoApproved"],
    strict: false,
  });

  // ─── Leave Rejected ────────────────────────────────────────────────
  safeRegister({
    type: "leave.rejected",
    version: 1,
    description: "Emitted when a leave request is rejected",
    producer: "LeaveDecisionHandler",
    requiredFields: ["idempotencyKey", "leaveRequestId", "employeeId", "rejectedAt"],
    optionalFields: ["rejectedByUserId", "reason"],
    strict: true,
  });

  // ─── Legacy Time Leave Requested ───────────────────────────────────
  safeRegister({
    type: "time.leave.requested",
    version: 1,
    description: "Emitted when a time leave request is submitted",
    producer: "LeaveManagement",
    requiredFields: ["scopeId", "leaveRequestId", "employeeId", "userId"],
    optionalFields: ["approverUserId"],
    strict: true,
  });

  // ─── Approval Request Decided ──────────────────────────────────────
  safeRegister({
    type: "approval.request.decided",
    version: 1,
    description: "Emitted by approval engine when a step chain resolves",
    producer: "PlatformApprovalEngineService",
    requiredFields: ["idempotencyKey", "approvalRequestId", "subjectType", "subjectId", "decision", "decidedAt"],
    optionalFields: ["decidedByUserId", "policyKey"],
    strict: true,
  });
}

export function registerPayrollEvents(): void {
  safeRegister({
    type: "PayrollGeneratedEvent",
    version: 1,
    description: "Emitted when an employee payroll item/payslip is generated",
    producer: "UpsertPayrollUseCase / GeneratePayrollRunUseCase",
    requiredFields: ["employeeId", "payrollId"],
    strict: true,
  });
  safeRegister({
    type: "payroll.run.processed",
    version: 1,
    description: "Emitted when a payroll run is generated and ready for approval",
    producer: "GeneratePayrollRunUseCase",
    requiredFields: ["payrollRunId"],
    optionalFields: ["scopeId", "processedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "payroll.approved",
    version: 1,
    description: "Emitted when a payroll run is approved",
    producer: "ApprovePayrollRunUseCase",
    requiredFields: ["payrollRunId", "approvedByUserId"],
    optionalFields: ["scopeId", "calculationStatus", "isProvisional", "settlementComplete"],
    strict: true,
  });
  safeRegister({
    type: "payroll.rejected",
    version: 1,
    description: "Emitted when a payroll run is rejected",
    producer: "RejectPayrollRunUseCase",
    requiredFields: ["payrollRunId", "rejectedByUserId", "reason"],
    optionalFields: ["scopeId"],
    strict: true,
  });
  safeRegister({
    type: "payroll.posted",
    version: 1,
    description: "Emitted when a payroll run is posted (final)",
    producer: "PostPayrollRunUseCase",
    requiredFields: ["payrollRunId", "postedByUserId"],
    optionalFields: ["scopeId", "calculationStatus", "isProvisional", "settlementComplete"],
    strict: true,
  });
  safeRegister({
    type: "payroll.payslip.published",
    version: 1,
    description: "Emitted when a payslip is published",
    producer: "PublishPayslipUseCase",
    requiredFields: ["payslipId", "employeeId"],
    optionalFields: ["payrollRunId", "calculationStatus", "isProvisional", "settlementComplete"],
    strict: true,
  });
  safeRegister({
    type: "payroll.financial-publication.completed",
    version: 1,
    description: "Emitted when payroll financial publication completes",
    producer: "PostPayrollRunUseCase",
    requiredFields: ["payrollRunId", "publicationReference"],
    optionalFields: ["scopeId", "calculationStatus", "isProvisional", "settlementComplete"],
    strict: true,
  });
}

export function registerRecruitmentEvents(): void {
  // ─── Requisition Approval Requested ────────────────────────────────
  safeRegister({
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
    optionalFields: ["requestedByUserId"],
    strict: true,
  });

  // ─── Offer Approval Requested ──────────────────────────────────────
  safeRegister({
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
    optionalFields: ["requestedByUserId"],
    strict: true,
  });

  // ─── Candidate Hired ───────────────────────────────────────────────
  safeRegister({
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
    optionalFields: [
      "postingId",
      "candidateEmail",
      "candidateName",
      "startDate",
      "compensation",
    ],
    strict: true,
  });
}

export function registerApprovalEvents(): void {
  // ─── Approval Request Created ───────────────────────────────────────
  safeRegister({
    type: "approval.request.created",
    version: 1,
    description: "Emitted when a new approval request is submitted",
    producer: "RequestApprovalUseCase",
    requiredFields: ["idempotencyKey", "approvalRequestId", "policyId", "subjectType", "subjectId", "requestedAt"],
    optionalFields: ["policyKey", "requestedByUserId"],
    strict: true,
  });

  // ─── Approval Request Completed ────────────────────────────────────
  safeRegister({
    type: "approval.request.completed",
    version: 1,
    description: "Emitted when an approval request reaches a terminal state",
    producer: "DecideApprovalStepUseCase / CancelApprovalUseCase",
    requiredFields: ["idempotencyKey", "approvalRequestId", "subjectType", "subjectId", "outcome", "completedAt"],
    optionalFields: ["policyKey", "decidedByUserId"],
    strict: true,
  });
}

export function registerAssetEvents(): void {
  // ─── Asset Request Approval Requested ──────────────────────────────
  safeRegister({
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
    optionalFields: ["requestedByUserId"],
    strict: true,
  });

  // ─── Asset Assigned ────────────────────────────────────────────────
  safeRegister({
    type: "asset.assigned",
    version: 1,
    description: "Emitted when assets are issued to an employee",
    producer: "IssueAssetUseCase",
    requiredFields: ["idempotencyKey", "issueId", "employeeId", "issuedAt"],
    optionalFields: ["requestId", "issuedByUserId", "items"],
    strict: true,
  });

  // ─── Asset Returned ────────────────────────────────────────────────
  safeRegister({
    type: "asset.returned",
    version: 1,
    description: "Emitted when issued assets are returned",
    producer: "ReturnAssetUseCase",
    requiredFields: ["idempotencyKey", "issueId", "employeeId", "returnedAt"],
    optionalFields: ["returnedByUserId", "items"],
    strict: true,
  });
}

export function registerTasksEvents(): void {
  safeRegister({
    type: "task.created",
    version: 1,
    description: "Emitted when a task is created",
    producer: "CreateTaskUseCase",
    requiredFields: ["taskId"],
    optionalFields: ["assigneeEmployeeId"],
    strict: false,
  });

  safeRegister({
    type: "task.completed",
    version: 1,
    description: "Emitted when a task is completed",
    producer: "ApproveTaskUseCase",
    requiredFields: ["taskId", "previousStatus", "nextStatus"],
    strict: false,
  });

  safeRegister({
    type: "task.reassigned",
    version: 1,
    description: "Emitted when a task is reassigned",
    producer: "ReassignTaskUseCase",
    requiredFields: ["taskId"],
    optionalFields: ["oldAssigneeId", "newAssigneeId", "reason"],
    strict: false,
  });

  safeRegister({
    type: "task.revision_requested",
    version: 1,
    description: "Emitted when a task is returned for revision",
    producer: "ReturnTaskUseCase",
    requiredFields: ["taskId", "previousStatus", "nextStatus"],
    optionalFields: ["reason"],
    strict: false,
  });
}

export function registerOnboardingEvents(): void {
  safeRegister({
    type: "onboarding.process.created",
    version: 1,
    description: "Emitted when an onboarding process is created with its checklist items",
    producer: "CreateOnboardingProcessUseCase",
    requiredFields: ["employeeId"],
    optionalFields: ["id", "processId", "templateId", "type", "status", "startDate", "targetEndDate", "assignedHrUserId", "completedAt", "checklistItems", "createdAt", "updatedAt"],
    strict: false,
  });
  safeRegister({
    type: "onboarding.item.completed",
    version: 1,
    description: "Emitted when an onboarding checklist item is transitioned (completed, skipped, reopened)",
    producer: "CompleteOnboardingTaskUseCase",
    requiredFields: ["processId", "itemId", "status"],
    optionalFields: ["completedByUserId", "completedAt", "notes"],
    strict: false,
  });
  safeRegister({
    type: "onboarding.process.completed",
    version: 1,
    description: "Emitted when all onboarding checklist items are finished and the process is completed",
    producer: "CompleteOnboardingTaskUseCase",
    requiredFields: ["processId", "employeeId"],
    optionalFields: ["completedAt"],
    strict: false,
  });
}

export function registerOffboardingEvents(): void {
  safeRegister({
    type: "offboarding.started",
    version: 1,
    description: "Emitted when an offboarding process is auto-started via EmployeeTerminatedEvent subscription",
    producer: "StartOffboardingUseCase",
    requiredFields: ["processId", "employeeId"],
    optionalFields: ["templateId"],
    strict: false,
  });
  safeRegister({
    type: "offboarding.completed",
    version: 1,
    description: "Emitted when an offboarding process completes (all clearances approved, mandatory items done)",
    producer: "CompleteProcessUseCase",
    requiredFields: ["processId", "employeeId"],
    strict: false,
  });
}

export function registerTimesheetEvents(): void {
  safeRegister({
    type: "timesheet.saved",
    version: 1,
    description: "Emitted when timesheet records are batch-saved",
    producer: "TimesheetService.batchSave",
    requiredFields: ["period", "recordCount", "actorUserId"],
    strict: true,
  });
  safeRegister({
    type: "timesheet.period.locked",
    version: 1,
    description: "Emitted when an attendance period is locked",
    producer: "PeriodLockService.lock",
    requiredFields: ["period", "actorUserId"],
    optionalFields: ["remarks"],
    strict: false,
  });
  safeRegister({
    type: "timesheet.period.unlocked",
    version: 1,
    description: "Emitted when an attendance period is unlocked",
    producer: "PeriodLockService.unlock",
    requiredFields: ["period", "actorUserId", "remarks"],
    strict: true,
  });
  safeRegister({
    type: "timesheet.period.reviewed",
    version: 1,
    description: "Emitted when an attendance period moves to in_review",
    producer: "PeriodLockService.review",
    requiredFields: ["period", "actorUserId"],
    strict: true,
  });
  safeRegister({
    type: "timesheet.period.approved",
    version: 1,
    description: "Emitted when an in_review attendance period is approved (locked)",
    producer: "PeriodLockService.approve",
    requiredFields: ["period", "actorUserId"],
    strict: true,
  });
  safeRegister({
    type: "timesheet.period.closed",
    version: 1,
    description: "Emitted when an attendance period is closed (final)",
    producer: "PeriodLockService.close",
    requiredFields: ["period", "actorUserId", "remarks", "snapshotCount"],
    strict: true,
  });
  safeRegister({
    type: "timesheet.period.reopened",
    version: 1,
    description: "Emitted when a closed attendance period is reopened (privileged)",
    producer: "PeriodLockService.reopen",
    requiredFields: ["period", "actorUserId", "remarks"],
    strict: true,
  });
  safeRegister({
    type: "attendance.payroll.reconciliation.started",
    version: 1,
    description: "Emitted when a payroll reconciliation run starts",
    producer: "PayrollReconciliationService.runReconciliation",
    requiredFields: ["period", "reconciliationId"],
    strict: true,
  });
  safeRegister({
    type: "attendance.payroll.reconciliation.completed",
    version: 1,
    description: "Emitted when a payroll reconciliation run completes",
    producer: "PayrollReconciliationService.runReconciliation",
    requiredFields: ["period", "reconciliationId", "totalEmployees", "matchedCount", "mismatchCount"],
    strict: true,
  });
  safeRegister({
    type: "attendance.adjustment.requested",
    version: 1,
    description: "Emitted when a post-closure adjustment is requested",
    producer: "AttendanceAdjustmentService.create",
    requiredFields: ["period", "adjustmentId", "employeeId", "requestedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "attendance.adjustment.approved",
    version: 1,
    description: "Emitted when an adjustment is approved",
    producer: "AttendanceAdjustmentService.approve",
    requiredFields: ["adjustmentId", "period", "approvedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "attendance.adjustment.rejected",
    version: 1,
    description: "Emitted when an adjustment is rejected",
    producer: "AttendanceAdjustmentService.reject",
    requiredFields: ["adjustmentId", "period", "rejectedByUserId", "reason"],
    strict: true,
  });
  safeRegister({
    type: "attendance.adjustment.applied",
    version: 1,
    description: "Emitted when an approved adjustment is applied",
    producer: "AttendanceAdjustmentService.apply",
    requiredFields: ["adjustmentId", "period"],
    strict: true,
  });
  safeRegister({
    type: "attendance.violation.created",
    version: 1,
    description: "Emitted when a daily attendance reconciliation detects a violation",
    producer: "ReconcileAttendanceDayUseCase",
    requiredFields: ["violationId", "sessionId", "employeeId", "code", "severity", "status"],
    strict: true,
  });
}

export function registerBenefitsEvents(): void {
  safeRegister({
    type: "benefits.enrollment.approved",
    version: 1,
    description: "Emitted when an employee benefit enrollment is approved",
    producer: "ApproveEnrollmentUseCase",
    requiredFields: ["enrollmentId", "planId", "employeeId", "approvedByUserId"],
    optionalFields: ["employerContribution", "employeeContribution", "effectiveFrom"],
    strict: true,
  });
  safeRegister({
    type: "benefits.enrollment.terminated",
    version: 1,
    description: "Emitted when an employee benefit enrollment is terminated",
    producer: "TerminateEnrollmentUseCase",
    requiredFields: ["enrollmentId", "planId", "employeeId", "terminatedByUserId"],
    strict: true,
  });
}

export function registerExpensesEvents(): void {
  safeRegister({
    type: "expenses.claim.submitted",
    version: 1,
    description: "Emitted when an expense claim is submitted",
    producer: "SubmitClaimUseCase",
    requiredFields: ["claimId", "employeeId", "totalAmount"],
    strict: true,
  });
  safeRegister({
    type: "expenses.claim.approved",
    version: 1,
    description: "Emitted when an expense claim is approved",
    producer: "ApproveClaimUseCase",
    requiredFields: ["claimId", "employeeId", "approvedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "expenses.claim.rejected",
    version: 1,
    description: "Emitted when an expense claim is rejected",
    producer: "RejectClaimUseCase",
    requiredFields: ["claimId", "employeeId"],
    optionalFields: ["rejectionReason"],
    strict: true,
  });
  safeRegister({
    type: "expenses.claim.reimbursed",
    version: 1,
    description: "Emitted when an expense claim is marked reimbursed",
    producer: "ReimburseClaimUseCase",
    requiredFields: ["claimId", "employeeId", "totalAmount"],
    strict: true,
  });
  safeRegister({
    type: "expenses.expense.submitted",
    version: 1,
    description: "Emitted when an expense is submitted",
    producer: "ExpensesModule",
    requiredFields: ["scopeId", "expenseId", "employeeId", "userId"],
    optionalFields: ["approverUserId"],
    strict: true,
  });
}

export function registerLearningEvents(): void {
  safeRegister({
    type: "learning.course.assigned",
    version: 1,
    description: "Emitted when a learning course is assigned to an employee",
    producer: "AssignCourseUseCase",
    requiredFields: ["assignmentId", "courseId", "employeeId", "assignedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "learning.course.completed",
    version: 1,
    description: "Emitted when an employee completes a learning course",
    producer: "CompleteCourseUseCase",
    requiredFields: ["enrollmentId", "courseId", "employeeId", "completedAt"],
    strict: true,
  });
  safeRegister({
    type: "learning.session.scheduled",
    version: 1,
    description: "Emitted when a learning session is published/scheduled",
    producer: "PublishSessionUseCase",
    requiredFields: ["sessionId", "courseId", "scheduledAt"],
    strict: true,
  });
  safeRegister({
    type: "learning.session.cancelled",
    version: 1,
    description: "Emitted when a learning session is cancelled",
    producer: "CancelSessionUseCase",
    requiredFields: ["sessionId", "courseId"],
    strict: true,
  });
  safeRegister({
    type: "learning.attendance.marked",
    version: 1,
    description: "Emitted when session attendance is checked in or completed",
    producer: "CheckinAttendanceUseCase / CompleteAttendanceUseCase",
    requiredFields: ["sessionId", "courseId", "employeeId", "status"],
    strict: true,
  });
  safeRegister({
    type: "learning.certificate.issued",
    version: 1,
    description: "Emitted when an employee certificate is issued",
    producer: "IssueCertificateUseCase",
    requiredFields: ["certificationId", "definitionId", "employeeId"],
    optionalFields: ["certificateNumber"],
    strict: true,
  });
  safeRegister({
    type: "learning.certificate.renewed",
    version: 1,
    description: "Emitted when an employee certificate is renewed",
    producer: "RenewCertificateUseCase",
    requiredFields: ["certificationId", "definitionId", "employeeId"],
    optionalFields: ["expiresAt"],
    strict: true,
  });
  safeRegister({
    type: "learning.certificate.revoked",
    version: 1,
    description: "Emitted when an employee certificate is revoked",
    producer: "RevokeCertificateUseCase",
    requiredFields: ["certificationId", "definitionId", "employeeId", "revokedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "learning.certificate.expired",
    version: 1,
    description: "Emitted when an employee certificate expires",
    producer: "LearningModule",
    requiredFields: ["certificationId", "definitionId", "employeeId"],
    strict: true,
  });
  safeRegister({
    type: "learning.path.assigned",
    version: 1,
    description: "Emitted when a learning path is assigned to an employee",
    producer: "AssignPathUseCase",
    requiredFields: ["assignmentId", "pathId", "employeeId", "assignedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "learning.path.completed",
    version: 1,
    description: "Emitted when an employee completes a learning path",
    producer: "CompletePathUseCase",
    requiredFields: ["assignmentId", "pathId", "employeeId"],
    strict: true,
  });
}

export function registerPerformanceEvents(): void {
  safeRegister({
    type: "performance.cycle.opened",
    version: 1,
    description: "Emitted when a performance cycle opens for planning",
    producer: "OpenPlanningUseCase",
    requiredFields: ["cycleId", "openedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "performance.cycle.closed",
    version: 1,
    description: "Emitted when a performance cycle is closed",
    producer: "CloseCycleUseCase",
    requiredFields: ["cycleId", "closedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "performance.goal.submitted",
    version: 1,
    description: "Emitted when an employee submits a performance goal",
    producer: "SubmitGoalUseCase",
    requiredFields: ["goalId", "cycleId", "employeeId"],
    strict: true,
  });
  safeRegister({
    type: "performance.goal.approved",
    version: 1,
    description: "Emitted when a performance goal is approved",
    producer: "ApproveGoalUseCase",
    requiredFields: ["goalId", "cycleId", "employeeId", "approvedByUserId"],
    strict: true,
  });
  safeRegister({
    type: "performance.review.submitted",
    version: 1,
    description: "Emitted when a performance review is submitted",
    producer: "SubmitReviewUseCase",
    requiredFields: ["reviewAssignmentId", "cycleId", "employeeId", "reviewerId", "reviewType"],
    strict: true,
  });
  safeRegister({
    type: "performance.review.completed",
    version: 1,
    description: "Emitted when a performance review is completed",
    producer: "PerformanceModule",
    requiredFields: ["scopeId", "reviewId", "employeeId", "userId"],
    optionalFields: ["reviewerUserId"],
    strict: true,
  });
  safeRegister({
    type: "performance.result.published",
    version: 1,
    description: "Emitted when final performance calibration/rating result is published",
    producer: "PublishResultUseCase",
    requiredFields: ["cycleId", "employeeId", "decidedByUserId"],
    optionalFields: ["finalScore", "ratingLabel"],
    strict: true,
  });
}

export function registerNotificationEvents(): void {
  safeRegister({
    type: "platform.notification.delivery_requested",
    version: 1,
    description: "Emitted when a platform notification delivery is staged",
    producer: "SendNotificationUseCase",
    requiredFields: ["notificationId", "userId", "type", "body"],
    optionalFields: ["email", "subject"],
    strict: true,
  });
}

export function registerAllDomainEvents(): void {
  registerWorkforceEvents();
  registerLeaveEvents();
  registerSchedulingEvents();
  registerTasksEvents();
  registerApprovalEvents();
  registerPayrollEvents();
  registerRecruitmentEvents();
  registerAssetEvents();
  registerOnboardingEvents();
  registerOffboardingEvents();
  registerTimesheetEvents();
  registerBenefitsEvents();
  registerExpensesEvents();
  registerLearningEvents();
  registerPerformanceEvents();
  registerNotificationEvents();
}
