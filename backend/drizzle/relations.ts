import { relations } from "drizzle-orm/relations";
import { schedules, workBlocks, tasks, taskActivities, users, branches, shiftTemplates, locations, holidayCalendars, taskAssignments, employees, taskComments, taskDelegations, departments, taskAttachments, taskDependencies, taskEvents, attendanceDailySummaries, attendanceExceptions, taskNotifications, taskTemplates, taskRecurrences, employeeEducations, files, userIdentities, applications, interviewScorecards, jobRequisitions, positions, offers, approvalRequests, recruitmentApprovalLinks, approvalPolicies, candidates, jobPostings, applicationStageEvents, boardingTemplates, boardingTemplateItems, boardingProcesses, boardingChecklistItems, exitInterviews, allowances, socialInsuranceEnrollments, offboardingClearances, offboardingSettlementLinks, payrollPeriods, payrollRuns, taskSlaRules, payslips, payrolls, taskSubmissions, payrollItems, payrollCostSummaries, notificationPreferences, workflowDefinitions, workflowInstances, headcountSnapshots, salaryStructures, attendanceMonthlyAggregates, notifications, notificationTemplates, pendingFileFinalizations, accessAuditLogs, roles, accessDenials, permissions, auditLogs, authorizationAuditLog, refreshTokens, accessGrants, certifications, employeeCompensations, jobAssignments, employeeDocuments, employeeEquipmentHandovers, employeeEquipmentHandoverItems, employmentRecords, employeeContracts, orgAssignments, attendanceEvents, leaveRequests, employeeIdentifiers, employeeStatusHistory, attendanceSessions, attendanceSummaryOverrides, attendances, gpsLogs, leavePolicies, leavePolicyAssignments, schedulesNew, attendanceOvertimeRequests, leaveTypes, leaveBalances, holidays, scheduleRequests, scheduleRequirements, workRoles, shiftRosterPublications, shiftRosterVersionSnapshots, employeeQualifications, employeeShiftAssignments, approvalSteps, leaveApprovalLinks, chatConversations, chatMessageReads, chatMessages, chatParticipants, webhookSubscriptions, webhookDeliveries, companies, shiftRosterLifecycleHistory, workflowInstanceTransitions, attendanceViolations, permissionHierarchy, rolePermissions, userRoles, userPermissions } from "./schema";

export const workBlocksRelations = relations(workBlocks, ({one}) => ({
	schedule: one(schedules, {
		fields: [workBlocks.scheduleId],
		references: [schedules.id]
	}),
}));

export const schedulesRelations = relations(schedules, ({one, many}) => ({
	workBlocks: many(workBlocks),
	employee: one(employees, {
		fields: [schedules.employeeId],
		references: [employees.id]
	}),
}));

export const taskActivitiesRelations = relations(taskActivities, ({one}) => ({
	task: one(tasks, {
		fields: [taskActivities.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [taskActivities.actorUserId],
		references: [users.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	taskActivities: many(taskActivities),
	taskAssignments: many(taskAssignments),
	taskComments: many(taskComments),
	taskAttachments: many(taskAttachments),
	taskDependencies_taskId: many(taskDependencies, {
		relationName: "taskDependencies_taskId_tasks_id"
	}),
	taskDependencies_dependsOnTaskId: many(taskDependencies, {
		relationName: "taskDependencies_dependsOnTaskId_tasks_id"
	}),
	taskEvents: many(taskEvents),
	taskNotifications: many(taskNotifications),
	taskRecurrences: many(taskRecurrences),
	employee: one(employees, {
		fields: [tasks.assigneeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [tasks.createdByUserId],
		references: [users.id]
	}),
	taskTemplate: one(taskTemplates, {
		fields: [tasks.templateId],
		references: [taskTemplates.id]
	}),
	task: one(tasks, {
		fields: [tasks.parentTaskId],
		references: [tasks.id],
		relationName: "tasks_parentTaskId_tasks_id"
	}),
	tasks: many(tasks, {
		relationName: "tasks_parentTaskId_tasks_id"
	}),
	taskSubmissions: many(taskSubmissions),
}));

export const usersRelations = relations(users, ({many}) => ({
	taskActivities: many(taskActivities),
	taskAssignments: many(taskAssignments),
	taskComments: many(taskComments),
	taskDelegations_delegatorUserId: many(taskDelegations, {
		relationName: "taskDelegations_delegatorUserId_users_id"
	}),
	taskDelegations_delegateeUserId: many(taskDelegations, {
		relationName: "taskDelegations_delegateeUserId_users_id"
	}),
	taskAttachments: many(taskAttachments),
	taskEvents: many(taskEvents),
	attendanceExceptions: many(attendanceExceptions),
	taskNotifications: many(taskNotifications),
	userIdentities: many(userIdentities),
	interviewScorecards: many(interviewScorecards),
	applicationStageEvents: many(applicationStageEvents),
	boardingTemplateItems: many(boardingTemplateItems),
	boardingProcesses: many(boardingProcesses),
	boardingChecklistItems_assigneeUserId: many(boardingChecklistItems, {
		relationName: "boardingChecklistItems_assigneeUserId_users_id"
	}),
	boardingChecklistItems_completedByUserId: many(boardingChecklistItems, {
		relationName: "boardingChecklistItems_completedByUserId_users_id"
	}),
	exitInterviews: many(exitInterviews),
	offboardingClearances: many(offboardingClearances),
	payrollRuns: many(payrollRuns),
	taskSlaRules: many(taskSlaRules),
	taskTemplates: many(taskTemplates),
	tasks: many(tasks),
	taskSubmissions: many(taskSubmissions),
	notificationPreferences: many(notificationPreferences),
	notifications: many(notifications),
	files: many(files),
	accessAuditLogs_actorUserId: many(accessAuditLogs, {
		relationName: "accessAuditLogs_actorUserId_users_id"
	}),
	accessAuditLogs_targetUserId: many(accessAuditLogs, {
		relationName: "accessAuditLogs_targetUserId_users_id"
	}),
	accessDenials_userId: many(accessDenials, {
		relationName: "accessDenials_userId_users_id"
	}),
	accessDenials_createdByUserId: many(accessDenials, {
		relationName: "accessDenials_createdByUserId_users_id"
	}),
	auditLogs: many(auditLogs),
	authorizationAuditLogs: many(authorizationAuditLog),
	refreshTokens: many(refreshTokens),
	accessGrants_userId: many(accessGrants, {
		relationName: "accessGrants_userId_users_id"
	}),
	accessGrants_approvedByUserId: many(accessGrants, {
		relationName: "accessGrants_approvedByUserId_users_id"
	}),
	accessGrants_revokedByUserId: many(accessGrants, {
		relationName: "accessGrants_revokedByUserId_users_id"
	}),
	employees: many(employees),
	employeeStatusHistories: many(employeeStatusHistory),
	attendanceSummaryOverrides: many(attendanceSummaryOverrides),
	schedulesNews_publishedBy: many(schedulesNew, {
		relationName: "schedulesNew_publishedBy_users_id"
	}),
	schedulesNews_lockedBy: many(schedulesNew, {
		relationName: "schedulesNew_lockedBy_users_id"
	}),
	attendanceOvertimeRequests: many(attendanceOvertimeRequests),
	leaveRequests: many(leaveRequests),
	scheduleRequests: many(scheduleRequests),
	shiftRosterPublications_submittedByUserId: many(shiftRosterPublications, {
		relationName: "shiftRosterPublications_submittedByUserId_users_id"
	}),
	shiftRosterPublications_approvedByUserId: many(shiftRosterPublications, {
		relationName: "shiftRosterPublications_approvedByUserId_users_id"
	}),
	shiftRosterPublications_rejectedByUserId: many(shiftRosterPublications, {
		relationName: "shiftRosterPublications_rejectedByUserId_users_id"
	}),
	shiftRosterPublications_publishedByUserId: many(shiftRosterPublications, {
		relationName: "shiftRosterPublications_publishedByUserId_users_id"
	}),
	shiftRosterPublications_lockedByUserId: many(shiftRosterPublications, {
		relationName: "shiftRosterPublications_lockedByUserId_users_id"
	}),
	shiftRosterVersionSnapshots: many(shiftRosterVersionSnapshots),
	employeeShiftAssignments: many(employeeShiftAssignments),
	approvalSteps_approverUserId: many(approvalSteps, {
		relationName: "approvalSteps_approverUserId_users_id"
	}),
	approvalSteps_decidedByUserId: many(approvalSteps, {
		relationName: "approvalSteps_decidedByUserId_users_id"
	}),
	chatConversations: many(chatConversations),
	chatMessageReads: many(chatMessageReads),
	chatMessages: many(chatMessages),
	chatParticipants: many(chatParticipants),
	shiftRosterLifecycleHistories: many(shiftRosterLifecycleHistory),
	workflowInstanceTransitions: many(workflowInstanceTransitions),
	approvalRequests: many(approvalRequests),
	userRoles_userId: many(userRoles, {
		relationName: "userRoles_userId_users_id"
	}),
	userRoles_grantedBy: many(userRoles, {
		relationName: "userRoles_grantedBy_users_id"
	}),
	userPermissions_userId: many(userPermissions, {
		relationName: "userPermissions_userId_users_id"
	}),
	userPermissions_grantedBy: many(userPermissions, {
		relationName: "userPermissions_grantedBy_users_id"
	}),
}));

export const shiftTemplatesRelations = relations(shiftTemplates, ({one, many}) => ({
	branch: one(branches, {
		fields: [shiftTemplates.branchId],
		references: [branches.id]
	}),
	location: one(locations, {
		fields: [shiftTemplates.locationId],
		references: [locations.id]
	}),
	holidayCalendar: one(holidayCalendars, {
		fields: [shiftTemplates.holidayCalendarId],
		references: [holidayCalendars.id]
	}),
	scheduleRequirements: many(scheduleRequirements),
	employeeShiftAssignments: many(employeeShiftAssignments),
}));

export const branchesRelations = relations(branches, ({one, many}) => ({
	shiftTemplates: many(shiftTemplates),
	payrollRuns: many(payrollRuns),
	payrollCostSummaries: many(payrollCostSummaries),
	headcountSnapshots: many(headcountSnapshots),
	departments: many(departments),
	locations: many(locations),
	employees: many(employees),
	leavePolicies: many(leavePolicies),
	holidayCalendars: many(holidayCalendars),
	shiftRosterPublications: many(shiftRosterPublications),
	company: one(companies, {
		fields: [branches.companyId],
		references: [companies.id]
	}),
}));

export const locationsRelations = relations(locations, ({one, many}) => ({
	shiftTemplates: many(shiftTemplates),
	branch: one(branches, {
		fields: [locations.branchId],
		references: [branches.id]
	}),
	location: one(locations, {
		fields: [locations.parentId],
		references: [locations.id],
		relationName: "locations_parentId_locations_id"
	}),
	locations: many(locations, {
		relationName: "locations_parentId_locations_id"
	}),
	employees: many(employees),
	attendanceEvents: many(attendanceEvents),
	attendances: many(attendances),
	scheduleRequirements: many(scheduleRequirements),
	employeeShiftAssignments: many(employeeShiftAssignments),
}));

export const holidayCalendarsRelations = relations(holidayCalendars, ({one, many}) => ({
	shiftTemplates: many(shiftTemplates),
	branch: one(branches, {
		fields: [holidayCalendars.branchId],
		references: [branches.id]
	}),
	holidays: many(holidays),
}));

export const taskAssignmentsRelations = relations(taskAssignments, ({one}) => ({
	task: one(tasks, {
		fields: [taskAssignments.taskId],
		references: [tasks.id]
	}),
	employee: one(employees, {
		fields: [taskAssignments.employeeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [taskAssignments.assignedByUserId],
		references: [users.id]
	}),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	taskAssignments: many(taskAssignments),
	attendanceExceptions: many(attendanceExceptions),
	employeeEducations: many(employeeEducations),
	boardingProcesses: many(boardingProcesses),
	exitInterviews: many(exitInterviews),
	allowances: many(allowances),
	socialInsuranceEnrollments: many(socialInsuranceEnrollments),
	offboardingSettlementLinks: many(offboardingSettlementLinks),
	taskTemplates: many(taskTemplates),
	payslips: many(payslips),
	payrolls: many(payrolls),
	tasks: many(tasks),
	payrollItems: many(payrollItems),
	salaryStructures: many(salaryStructures, {
		relationName: "salaryStructures_employeeId_employees_id"
	}),
	attendanceMonthlyAggregates: many(attendanceMonthlyAggregates),
	certifications: many(certifications),
	employeeCompensations: many(employeeCompensations),
	employeeDocuments: many(employeeDocuments),
	employeeContracts: many(employeeContracts),
	orgAssignments_employeeId: many(orgAssignments, {
		relationName: "orgAssignments_employeeId_employees_id"
	}),
	orgAssignments_managerEmployeeId: many(orgAssignments, {
		relationName: "orgAssignments_managerEmployeeId_employees_id"
	}),
	jobAssignments: many(jobAssignments),
	employeeEquipmentHandovers: many(employeeEquipmentHandovers),
	user: one(users, {
		fields: [employees.userId],
		references: [users.id]
	}),
	branch: one(branches, {
		fields: [employees.branchId],
		references: [branches.id]
	}),
	location: one(locations, {
		fields: [employees.locationId],
		references: [locations.id]
	}),
	employmentRecord: one(employmentRecords, {
		fields: [employees.currentEmploymentRecordId],
		references: [employmentRecords.id],
		relationName: "employees_currentEmploymentRecordId_employmentRecords_id"
	}),
	orgAssignment: one(orgAssignments, {
		fields: [employees.currentOrgAssignmentId],
		references: [orgAssignments.id],
		relationName: "employees_currentOrgAssignmentId_orgAssignments_id"
	}),
	salaryStructure: one(salaryStructures, {
		fields: [employees.currentSalaryStructureId],
		references: [salaryStructures.id],
		relationName: "employees_currentSalaryStructureId_salaryStructures_id"
	}),
	department: one(departments, {
		fields: [employees.departmentId],
		references: [departments.id]
	}),
	attendanceEvents: many(attendanceEvents),
	attendanceDailySummaries: many(attendanceDailySummaries),
	employmentRecords_employeeId: many(employmentRecords, {
		relationName: "employmentRecords_employeeId_employees_id"
	}),
	employmentRecords_managerEmployeeId: many(employmentRecords, {
		relationName: "employmentRecords_managerEmployeeId_employees_id"
	}),
	employeeIdentifiers: many(employeeIdentifiers),
	employeeStatusHistories: many(employeeStatusHistory),
	attendanceSessions: many(attendanceSessions),
	attendanceSummaryOverrides: many(attendanceSummaryOverrides),
	attendances: many(attendances),
	gpsLogs: many(gpsLogs),
	leavePolicyAssignments: many(leavePolicyAssignments),
	attendanceOvertimeRequests: many(attendanceOvertimeRequests),
	leaveRequests: many(leaveRequests),
	leaveBalances: many(leaveBalances),
	scheduleRequests: many(scheduleRequests),
	employeeQualifications: many(employeeQualifications),
	employeeShiftAssignments: many(employeeShiftAssignments),
	schedules: many(schedules),
	attendanceViolations: many(attendanceViolations),
}));

export const taskCommentsRelations = relations(taskComments, ({one}) => ({
	task: one(tasks, {
		fields: [taskComments.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [taskComments.authorUserId],
		references: [users.id]
	}),
}));

export const taskDelegationsRelations = relations(taskDelegations, ({one}) => ({
	user_delegatorUserId: one(users, {
		fields: [taskDelegations.delegatorUserId],
		references: [users.id],
		relationName: "taskDelegations_delegatorUserId_users_id"
	}),
	user_delegateeUserId: one(users, {
		fields: [taskDelegations.delegateeUserId],
		references: [users.id],
		relationName: "taskDelegations_delegateeUserId_users_id"
	}),
	department: one(departments, {
		fields: [taskDelegations.departmentId],
		references: [departments.id]
	}),
}));

export const departmentsRelations = relations(departments, ({one, many}) => ({
	taskDelegations: many(taskDelegations),
	jobRequisitions: many(jobRequisitions),
	boardingTemplates: many(boardingTemplates),
	taskTemplates: many(taskTemplates),
	payrollCostSummaries: many(payrollCostSummaries),
	headcountSnapshots: many(headcountSnapshots),
	branch: one(branches, {
		fields: [departments.branchId],
		references: [branches.id]
	}),
	department: one(departments, {
		fields: [departments.parentId],
		references: [departments.id],
		relationName: "departments_parentId_departments_id"
	}),
	departments: many(departments, {
		relationName: "departments_parentId_departments_id"
	}),
	orgAssignments: many(orgAssignments),
	employees: many(employees),
	shiftRosterPublications: many(shiftRosterPublications),
}));

export const taskAttachmentsRelations = relations(taskAttachments, ({one}) => ({
	task: one(tasks, {
		fields: [taskAttachments.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [taskAttachments.uploadedByUserId],
		references: [users.id]
	}),
}));

export const taskDependenciesRelations = relations(taskDependencies, ({one}) => ({
	task_taskId: one(tasks, {
		fields: [taskDependencies.taskId],
		references: [tasks.id],
		relationName: "taskDependencies_taskId_tasks_id"
	}),
	task_dependsOnTaskId: one(tasks, {
		fields: [taskDependencies.dependsOnTaskId],
		references: [tasks.id],
		relationName: "taskDependencies_dependsOnTaskId_tasks_id"
	}),
}));

export const taskEventsRelations = relations(taskEvents, ({one}) => ({
	task: one(tasks, {
		fields: [taskEvents.aggregateId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [taskEvents.actorUserId],
		references: [users.id]
	}),
}));

export const attendanceExceptionsRelations = relations(attendanceExceptions, ({one}) => ({
	attendanceDailySummary: one(attendanceDailySummaries, {
		fields: [attendanceExceptions.attendanceDailySummaryId],
		references: [attendanceDailySummaries.id]
	}),
	employee: one(employees, {
		fields: [attendanceExceptions.employeeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [attendanceExceptions.resolvedByUserId],
		references: [users.id]
	}),
}));

export const attendanceDailySummariesRelations = relations(attendanceDailySummaries, ({one, many}) => ({
	attendanceExceptions: many(attendanceExceptions),
	leaveRequest: one(leaveRequests, {
		fields: [attendanceDailySummaries.leaveRequestId],
		references: [leaveRequests.id]
	}),
	employee: one(employees, {
		fields: [attendanceDailySummaries.employeeId],
		references: [employees.id]
	}),
}));

export const taskNotificationsRelations = relations(taskNotifications, ({one}) => ({
	user: one(users, {
		fields: [taskNotifications.userId],
		references: [users.id]
	}),
	task: one(tasks, {
		fields: [taskNotifications.taskId],
		references: [tasks.id]
	}),
}));

export const taskRecurrencesRelations = relations(taskRecurrences, ({one}) => ({
	taskTemplate: one(taskTemplates, {
		fields: [taskRecurrences.templateId],
		references: [taskTemplates.id]
	}),
	task: one(tasks, {
		fields: [taskRecurrences.lastCreatedTaskId],
		references: [tasks.id]
	}),
}));

export const taskTemplatesRelations = relations(taskTemplates, ({one, many}) => ({
	taskRecurrences: many(taskRecurrences),
	employee: one(employees, {
		fields: [taskTemplates.defaultAssigneeId],
		references: [employees.id]
	}),
	department: one(departments, {
		fields: [taskTemplates.departmentId],
		references: [departments.id]
	}),
	user: one(users, {
		fields: [taskTemplates.createdByUserId],
		references: [users.id]
	}),
	tasks: many(tasks),
}));

export const employeeEducationsRelations = relations(employeeEducations, ({one}) => ({
	employee: one(employees, {
		fields: [employeeEducations.employeeId],
		references: [employees.id]
	}),
	file: one(files, {
		fields: [employeeEducations.documentId],
		references: [files.id]
	}),
}));

export const filesRelations = relations(files, ({one, many}) => ({
	employeeEducations: many(employeeEducations),
	applications: many(applications),
	user: one(users, {
		fields: [files.uploadedBy],
		references: [users.id]
	}),
	pendingFileFinalizations: many(pendingFileFinalizations),
	certifications: many(certifications),
	employeeDocuments: many(employeeDocuments),
	employeeEquipmentHandoverItems: many(employeeEquipmentHandoverItems),
	employeeEquipmentHandovers: many(employeeEquipmentHandovers),
}));

export const userIdentitiesRelations = relations(userIdentities, ({one}) => ({
	user: one(users, {
		fields: [userIdentities.userId],
		references: [users.id]
	}),
}));

export const interviewScorecardsRelations = relations(interviewScorecards, ({one}) => ({
	application: one(applications, {
		fields: [interviewScorecards.applicationId],
		references: [applications.id]
	}),
	user: one(users, {
		fields: [interviewScorecards.interviewerUserId],
		references: [users.id]
	}),
}));

export const applicationsRelations = relations(applications, ({one, many}) => ({
	interviewScorecards: many(interviewScorecards),
	offers: many(offers),
	candidate: one(candidates, {
		fields: [applications.candidateId],
		references: [candidates.id]
	}),
	jobPosting: one(jobPostings, {
		fields: [applications.postingId],
		references: [jobPostings.id]
	}),
	file: one(files, {
		fields: [applications.cvFileId],
		references: [files.id]
	}),
	applicationStageEvents: many(applicationStageEvents),
}));

export const jobRequisitionsRelations = relations(jobRequisitions, ({one, many}) => ({
	department: one(departments, {
		fields: [jobRequisitions.departmentId],
		references: [departments.id]
	}),
	position: one(positions, {
		fields: [jobRequisitions.positionId],
		references: [positions.id]
	}),
	jobPostings: many(jobPostings),
}));

export const positionsRelations = relations(positions, ({many}) => ({
	jobRequisitions: many(jobRequisitions),
	boardingTemplates: many(boardingTemplates),
	jobAssignments: many(jobAssignments),
}));

export const offersRelations = relations(offers, ({one}) => ({
	application: one(applications, {
		fields: [offers.applicationId],
		references: [applications.id]
	}),
}));

export const recruitmentApprovalLinksRelations = relations(recruitmentApprovalLinks, ({one}) => ({
	approvalRequest: one(approvalRequests, {
		fields: [recruitmentApprovalLinks.approvalRequestId],
		references: [approvalRequests.id]
	}),
	approvalPolicy: one(approvalPolicies, {
		fields: [recruitmentApprovalLinks.policyId],
		references: [approvalPolicies.id]
	}),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({one, many}) => ({
	recruitmentApprovalLinks: many(recruitmentApprovalLinks),
	approvalSteps: many(approvalSteps),
	leaveApprovalLinks: many(leaveApprovalLinks),
	approvalPolicy: one(approvalPolicies, {
		fields: [approvalRequests.policyId],
		references: [approvalPolicies.id]
	}),
	user: one(users, {
		fields: [approvalRequests.requestedByUserId],
		references: [users.id]
	}),
}));

export const approvalPoliciesRelations = relations(approvalPolicies, ({many}) => ({
	recruitmentApprovalLinks: many(recruitmentApprovalLinks),
	leaveApprovalLinks: many(leaveApprovalLinks),
	approvalRequests: many(approvalRequests),
}));

export const candidatesRelations = relations(candidates, ({many}) => ({
	applications: many(applications),
}));

export const jobPostingsRelations = relations(jobPostings, ({one, many}) => ({
	applications: many(applications),
	jobRequisition: one(jobRequisitions, {
		fields: [jobPostings.requisitionId],
		references: [jobRequisitions.id]
	}),
}));

export const applicationStageEventsRelations = relations(applicationStageEvents, ({one}) => ({
	application: one(applications, {
		fields: [applicationStageEvents.applicationId],
		references: [applications.id]
	}),
	user: one(users, {
		fields: [applicationStageEvents.actorUserId],
		references: [users.id]
	}),
}));

export const boardingTemplatesRelations = relations(boardingTemplates, ({one, many}) => ({
	department: one(departments, {
		fields: [boardingTemplates.departmentId],
		references: [departments.id]
	}),
	position: one(positions, {
		fields: [boardingTemplates.positionId],
		references: [positions.id]
	}),
	boardingTemplateItems: many(boardingTemplateItems),
	boardingProcesses: many(boardingProcesses),
}));

export const boardingTemplateItemsRelations = relations(boardingTemplateItems, ({one, many}) => ({
	boardingTemplate: one(boardingTemplates, {
		fields: [boardingTemplateItems.templateId],
		references: [boardingTemplates.id]
	}),
	user: one(users, {
		fields: [boardingTemplateItems.defaultAssigneeUserId],
		references: [users.id]
	}),
	boardingChecklistItems: many(boardingChecklistItems),
}));

export const boardingProcessesRelations = relations(boardingProcesses, ({one, many}) => ({
	employee: one(employees, {
		fields: [boardingProcesses.employeeId],
		references: [employees.id]
	}),
	boardingTemplate: one(boardingTemplates, {
		fields: [boardingProcesses.templateId],
		references: [boardingTemplates.id]
	}),
	user: one(users, {
		fields: [boardingProcesses.assignedHrUserId],
		references: [users.id]
	}),
	boardingChecklistItems: many(boardingChecklistItems),
	exitInterviews: many(exitInterviews),
	offboardingClearances: many(offboardingClearances),
	offboardingSettlementLinks: many(offboardingSettlementLinks),
}));

export const boardingChecklistItemsRelations = relations(boardingChecklistItems, ({one}) => ({
	boardingProcess: one(boardingProcesses, {
		fields: [boardingChecklistItems.processId],
		references: [boardingProcesses.id]
	}),
	boardingTemplateItem: one(boardingTemplateItems, {
		fields: [boardingChecklistItems.templateItemId],
		references: [boardingTemplateItems.id]
	}),
	user_assigneeUserId: one(users, {
		fields: [boardingChecklistItems.assigneeUserId],
		references: [users.id],
		relationName: "boardingChecklistItems_assigneeUserId_users_id"
	}),
	user_completedByUserId: one(users, {
		fields: [boardingChecklistItems.completedByUserId],
		references: [users.id],
		relationName: "boardingChecklistItems_completedByUserId_users_id"
	}),
}));

export const exitInterviewsRelations = relations(exitInterviews, ({one}) => ({
	boardingProcess: one(boardingProcesses, {
		fields: [exitInterviews.processId],
		references: [boardingProcesses.id]
	}),
	employee: one(employees, {
		fields: [exitInterviews.employeeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [exitInterviews.interviewerUserId],
		references: [users.id]
	}),
}));

export const allowancesRelations = relations(allowances, ({one}) => ({
	employee: one(employees, {
		fields: [allowances.employeeId],
		references: [employees.id]
	}),
}));

export const socialInsuranceEnrollmentsRelations = relations(socialInsuranceEnrollments, ({one}) => ({
	employee: one(employees, {
		fields: [socialInsuranceEnrollments.employeeId],
		references: [employees.id]
	}),
}));

export const offboardingClearancesRelations = relations(offboardingClearances, ({one}) => ({
	boardingProcess: one(boardingProcesses, {
		fields: [offboardingClearances.processId],
		references: [boardingProcesses.id]
	}),
	user: one(users, {
		fields: [offboardingClearances.decidedByUserId],
		references: [users.id]
	}),
}));

export const offboardingSettlementLinksRelations = relations(offboardingSettlementLinks, ({one}) => ({
	boardingProcess: one(boardingProcesses, {
		fields: [offboardingSettlementLinks.processId],
		references: [boardingProcesses.id]
	}),
	employee: one(employees, {
		fields: [offboardingSettlementLinks.employeeId],
		references: [employees.id]
	}),
}));

export const payrollRunsRelations = relations(payrollRuns, ({one, many}) => ({
	payrollPeriod: one(payrollPeriods, {
		fields: [payrollRuns.payrollPeriodId],
		references: [payrollPeriods.id]
	}),
	branch: one(branches, {
		fields: [payrollRuns.branchId],
		references: [branches.id]
	}),
	user: one(users, {
		fields: [payrollRuns.approvedByUserId],
		references: [users.id]
	}),
	payslips: many(payslips),
	payrolls: many(payrolls),
	payrollItems: many(payrollItems),
}));

export const payrollPeriodsRelations = relations(payrollPeriods, ({many}) => ({
	payrollRuns: many(payrollRuns),
	payrolls: many(payrolls),
	payrollCostSummaries: many(payrollCostSummaries),
}));

export const taskSlaRulesRelations = relations(taskSlaRules, ({one}) => ({
	user: one(users, {
		fields: [taskSlaRules.escalateToUserId],
		references: [users.id]
	}),
}));

export const payslipsRelations = relations(payslips, ({one, many}) => ({
	payrollRun: one(payrollRuns, {
		fields: [payslips.payrollRunId],
		references: [payrollRuns.id]
	}),
	employee: one(employees, {
		fields: [payslips.employeeId],
		references: [employees.id]
	}),
	payrollItems: many(payrollItems),
}));

export const payrollsRelations = relations(payrolls, ({one}) => ({
	employee: one(employees, {
		fields: [payrolls.employeeId],
		references: [employees.id]
	}),
	payrollPeriod: one(payrollPeriods, {
		fields: [payrolls.payrollPeriodId],
		references: [payrollPeriods.id]
	}),
	payrollRun: one(payrollRuns, {
		fields: [payrolls.payrollRunId],
		references: [payrollRuns.id]
	}),
}));

export const taskSubmissionsRelations = relations(taskSubmissions, ({one}) => ({
	task: one(tasks, {
		fields: [taskSubmissions.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [taskSubmissions.submittedByUserId],
		references: [users.id]
	}),
}));

export const payrollItemsRelations = relations(payrollItems, ({one}) => ({
	payrollRun: one(payrollRuns, {
		fields: [payrollItems.payrollRunId],
		references: [payrollRuns.id]
	}),
	employee: one(employees, {
		fields: [payrollItems.employeeId],
		references: [employees.id]
	}),
	payslip: one(payslips, {
		fields: [payrollItems.payslipId],
		references: [payslips.id]
	}),
}));

export const payrollCostSummariesRelations = relations(payrollCostSummaries, ({one}) => ({
	payrollPeriod: one(payrollPeriods, {
		fields: [payrollCostSummaries.payrollPeriodId],
		references: [payrollPeriods.id]
	}),
	branch: one(branches, {
		fields: [payrollCostSummaries.branchId],
		references: [branches.id]
	}),
	department: one(departments, {
		fields: [payrollCostSummaries.departmentId],
		references: [departments.id]
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [notificationPreferences.userId],
		references: [users.id]
	}),
}));

export const workflowInstancesRelations = relations(workflowInstances, ({one, many}) => ({
	workflowDefinition: one(workflowDefinitions, {
		fields: [workflowInstances.definitionId],
		references: [workflowDefinitions.id]
	}),
	workflowInstanceTransitions: many(workflowInstanceTransitions),
}));

export const workflowDefinitionsRelations = relations(workflowDefinitions, ({many}) => ({
	workflowInstances: many(workflowInstances),
}));

export const headcountSnapshotsRelations = relations(headcountSnapshots, ({one}) => ({
	branch: one(branches, {
		fields: [headcountSnapshots.branchId],
		references: [branches.id]
	}),
	department: one(departments, {
		fields: [headcountSnapshots.departmentId],
		references: [departments.id]
	}),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({one, many}) => ({
	employee: one(employees, {
		fields: [salaryStructures.employeeId],
		references: [employees.id],
		relationName: "salaryStructures_employeeId_employees_id"
	}),
	employees: many(employees, {
		relationName: "employees_currentSalaryStructureId_salaryStructures_id"
	}),
}));

export const attendanceMonthlyAggregatesRelations = relations(attendanceMonthlyAggregates, ({one}) => ({
	employee: one(employees, {
		fields: [attendanceMonthlyAggregates.employeeId],
		references: [employees.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
	notificationTemplate: one(notificationTemplates, {
		fields: [notifications.templateId],
		references: [notificationTemplates.id]
	}),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({many}) => ({
	notifications: many(notifications),
}));

export const pendingFileFinalizationsRelations = relations(pendingFileFinalizations, ({one}) => ({
	file: one(files, {
		fields: [pendingFileFinalizations.fileId],
		references: [files.id]
	}),
}));

export const accessAuditLogsRelations = relations(accessAuditLogs, ({one}) => ({
	user_actorUserId: one(users, {
		fields: [accessAuditLogs.actorUserId],
		references: [users.id],
		relationName: "accessAuditLogs_actorUserId_users_id"
	}),
	user_targetUserId: one(users, {
		fields: [accessAuditLogs.targetUserId],
		references: [users.id],
		relationName: "accessAuditLogs_targetUserId_users_id"
	}),
	role: one(roles, {
		fields: [accessAuditLogs.roleId],
		references: [roles.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	accessAuditLogs: many(accessAuditLogs),
	rolePermissions: many(rolePermissions),
	userRoles: many(userRoles),
}));

export const accessDenialsRelations = relations(accessDenials, ({one}) => ({
	user_userId: one(users, {
		fields: [accessDenials.userId],
		references: [users.id],
		relationName: "accessDenials_userId_users_id"
	}),
	permission: one(permissions, {
		fields: [accessDenials.permissionCode],
		references: [permissions.code]
	}),
	user_createdByUserId: one(users, {
		fields: [accessDenials.createdByUserId],
		references: [users.id],
		relationName: "accessDenials_createdByUserId_users_id"
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	accessDenials: many(accessDenials),
	accessGrants: many(accessGrants),
	permissionHierarchies_parentPermission: many(permissionHierarchy, {
		relationName: "permissionHierarchy_parentPermission_permissions_code"
	}),
	permissionHierarchies_childPermission: many(permissionHierarchy, {
		relationName: "permissionHierarchy_childPermission_permissions_code"
	}),
	rolePermissions: many(rolePermissions),
	userPermissions: many(userPermissions),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.actorUserId],
		references: [users.id]
	}),
}));

export const authorizationAuditLogRelations = relations(authorizationAuditLog, ({one}) => ({
	user: one(users, {
		fields: [authorizationAuditLog.userId],
		references: [users.id]
	}),
}));

export const refreshTokensRelations = relations(refreshTokens, ({one}) => ({
	user: one(users, {
		fields: [refreshTokens.userId],
		references: [users.id]
	}),
}));

export const accessGrantsRelations = relations(accessGrants, ({one}) => ({
	user_userId: one(users, {
		fields: [accessGrants.userId],
		references: [users.id],
		relationName: "accessGrants_userId_users_id"
	}),
	permission: one(permissions, {
		fields: [accessGrants.permissionCode],
		references: [permissions.code]
	}),
	user_approvedByUserId: one(users, {
		fields: [accessGrants.approvedByUserId],
		references: [users.id],
		relationName: "accessGrants_approvedByUserId_users_id"
	}),
	user_revokedByUserId: one(users, {
		fields: [accessGrants.revokedByUserId],
		references: [users.id],
		relationName: "accessGrants_revokedByUserId_users_id"
	}),
}));

export const certificationsRelations = relations(certifications, ({one}) => ({
	employee: one(employees, {
		fields: [certifications.employeeId],
		references: [employees.id]
	}),
	file: one(files, {
		fields: [certifications.fileId],
		references: [files.id]
	}),
}));

export const employeeCompensationsRelations = relations(employeeCompensations, ({one}) => ({
	employee: one(employees, {
		fields: [employeeCompensations.employeeId],
		references: [employees.id]
	}),
	jobAssignment: one(jobAssignments, {
		fields: [employeeCompensations.jobAssignmentId],
		references: [jobAssignments.id]
	}),
}));

export const jobAssignmentsRelations = relations(jobAssignments, ({one, many}) => ({
	employeeCompensations: many(employeeCompensations),
	employee: one(employees, {
		fields: [jobAssignments.employeeId],
		references: [employees.id]
	}),
	position: one(positions, {
		fields: [jobAssignments.positionId],
		references: [positions.id]
	}),
}));

export const employeeDocumentsRelations = relations(employeeDocuments, ({one}) => ({
	employee: one(employees, {
		fields: [employeeDocuments.employeeId],
		references: [employees.id]
	}),
	file: one(files, {
		fields: [employeeDocuments.fileId],
		references: [files.id]
	}),
}));

export const employeeEquipmentHandoverItemsRelations = relations(employeeEquipmentHandoverItems, ({one}) => ({
	employeeEquipmentHandover: one(employeeEquipmentHandovers, {
		fields: [employeeEquipmentHandoverItems.handoverId],
		references: [employeeEquipmentHandovers.id]
	}),
	file: one(files, {
		fields: [employeeEquipmentHandoverItems.documentId],
		references: [files.id]
	}),
}));

export const employeeEquipmentHandoversRelations = relations(employeeEquipmentHandovers, ({one, many}) => ({
	employeeEquipmentHandoverItems: many(employeeEquipmentHandoverItems),
	employee: one(employees, {
		fields: [employeeEquipmentHandovers.employeeId],
		references: [employees.id]
	}),
	file: one(files, {
		fields: [employeeEquipmentHandovers.documentId],
		references: [files.id]
	}),
}));

export const employeeContractsRelations = relations(employeeContracts, ({one}) => ({
	employmentRecord: one(employmentRecords, {
		fields: [employeeContracts.employmentRecordId],
		references: [employmentRecords.id]
	}),
	employee: one(employees, {
		fields: [employeeContracts.employeeId],
		references: [employees.id]
	}),
}));

export const employmentRecordsRelations = relations(employmentRecords, ({one, many}) => ({
	employeeContracts: many(employeeContracts),
	employees: many(employees, {
		relationName: "employees_currentEmploymentRecordId_employmentRecords_id"
	}),
	employee_employeeId: one(employees, {
		fields: [employmentRecords.employeeId],
		references: [employees.id],
		relationName: "employmentRecords_employeeId_employees_id"
	}),
	employee_managerEmployeeId: one(employees, {
		fields: [employmentRecords.managerEmployeeId],
		references: [employees.id],
		relationName: "employmentRecords_managerEmployeeId_employees_id"
	}),
}));

export const orgAssignmentsRelations = relations(orgAssignments, ({one, many}) => ({
	employee_employeeId: one(employees, {
		fields: [orgAssignments.employeeId],
		references: [employees.id],
		relationName: "orgAssignments_employeeId_employees_id"
	}),
	department: one(departments, {
		fields: [orgAssignments.departmentId],
		references: [departments.id]
	}),
	employee_managerEmployeeId: one(employees, {
		fields: [orgAssignments.managerEmployeeId],
		references: [employees.id],
		relationName: "orgAssignments_managerEmployeeId_employees_id"
	}),
	employees: many(employees, {
		relationName: "employees_currentOrgAssignmentId_orgAssignments_id"
	}),
}));

export const attendanceEventsRelations = relations(attendanceEvents, ({one}) => ({
	employee: one(employees, {
		fields: [attendanceEvents.employeeId],
		references: [employees.id]
	}),
	location: one(locations, {
		fields: [attendanceEvents.locationId],
		references: [locations.id]
	}),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({one, many}) => ({
	attendanceDailySummaries: many(attendanceDailySummaries),
	employee: one(employees, {
		fields: [leaveRequests.employeeId],
		references: [employees.id]
	}),
	leaveType: one(leaveTypes, {
		fields: [leaveRequests.leaveTypeId],
		references: [leaveTypes.id]
	}),
	user: one(users, {
		fields: [leaveRequests.approverUserId],
		references: [users.id]
	}),
	leaveApprovalLinks: many(leaveApprovalLinks),
}));

export const employeeIdentifiersRelations = relations(employeeIdentifiers, ({one}) => ({
	employee: one(employees, {
		fields: [employeeIdentifiers.employeeId],
		references: [employees.id]
	}),
}));

export const employeeStatusHistoryRelations = relations(employeeStatusHistory, ({one}) => ({
	employee: one(employees, {
		fields: [employeeStatusHistory.employeeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [employeeStatusHistory.changedBy],
		references: [users.id]
	}),
}));

export const attendanceSessionsRelations = relations(attendanceSessions, ({one, many}) => ({
	employee: one(employees, {
		fields: [attendanceSessions.employeeId],
		references: [employees.id]
	}),
	attendances: many(attendances),
	attendanceViolations: many(attendanceViolations),
}));

export const attendanceSummaryOverridesRelations = relations(attendanceSummaryOverrides, ({one}) => ({
	employee: one(employees, {
		fields: [attendanceSummaryOverrides.employeeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [attendanceSummaryOverrides.createdByUserId],
		references: [users.id]
	}),
}));

export const attendancesRelations = relations(attendances, ({one}) => ({
	employee: one(employees, {
		fields: [attendances.employeeId],
		references: [employees.id]
	}),
	attendanceSession: one(attendanceSessions, {
		fields: [attendances.sessionId],
		references: [attendanceSessions.id]
	}),
	location: one(locations, {
		fields: [attendances.locationId],
		references: [locations.id]
	}),
}));

export const gpsLogsRelations = relations(gpsLogs, ({one}) => ({
	employee: one(employees, {
		fields: [gpsLogs.employeeId],
		references: [employees.id]
	}),
}));

export const leavePolicyAssignmentsRelations = relations(leavePolicyAssignments, ({one}) => ({
	leavePolicy: one(leavePolicies, {
		fields: [leavePolicyAssignments.policyId],
		references: [leavePolicies.id]
	}),
	employee: one(employees, {
		fields: [leavePolicyAssignments.employeeId],
		references: [employees.id]
	}),
}));

export const leavePoliciesRelations = relations(leavePolicies, ({one, many}) => ({
	leavePolicyAssignments: many(leavePolicyAssignments),
	branch: one(branches, {
		fields: [leavePolicies.branchId],
		references: [branches.id]
	}),
	leaveTypes: many(leaveTypes),
}));

export const schedulesNewRelations = relations(schedulesNew, ({one, many}) => ({
	user_publishedBy: one(users, {
		fields: [schedulesNew.publishedBy],
		references: [users.id],
		relationName: "schedulesNew_publishedBy_users_id"
	}),
	user_lockedBy: one(users, {
		fields: [schedulesNew.lockedBy],
		references: [users.id],
		relationName: "schedulesNew_lockedBy_users_id"
	}),
	scheduleRequirements: many(scheduleRequirements),
	employeeShiftAssignments: many(employeeShiftAssignments),
}));

export const attendanceOvertimeRequestsRelations = relations(attendanceOvertimeRequests, ({one}) => ({
	employee: one(employees, {
		fields: [attendanceOvertimeRequests.employeeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [attendanceOvertimeRequests.approvedByUserId],
		references: [users.id]
	}),
}));

export const leaveTypesRelations = relations(leaveTypes, ({one, many}) => ({
	leaveRequests: many(leaveRequests),
	leaveBalances: many(leaveBalances),
	leavePolicy: one(leavePolicies, {
		fields: [leaveTypes.policyId],
		references: [leavePolicies.id]
	}),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({one}) => ({
	employee: one(employees, {
		fields: [leaveBalances.employeeId],
		references: [employees.id]
	}),
	leaveType: one(leaveTypes, {
		fields: [leaveBalances.leaveTypeId],
		references: [leaveTypes.id]
	}),
}));

export const holidaysRelations = relations(holidays, ({one}) => ({
	holidayCalendar: one(holidayCalendars, {
		fields: [holidays.holidayCalendarId],
		references: [holidayCalendars.id]
	}),
}));

export const scheduleRequestsRelations = relations(scheduleRequests, ({one}) => ({
	employee: one(employees, {
		fields: [scheduleRequests.employeeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [scheduleRequests.reviewedBy],
		references: [users.id]
	}),
}));

export const scheduleRequirementsRelations = relations(scheduleRequirements, ({one}) => ({
	schedulesNew: one(schedulesNew, {
		fields: [scheduleRequirements.scheduleId],
		references: [schedulesNew.id]
	}),
	location: one(locations, {
		fields: [scheduleRequirements.locationId],
		references: [locations.id]
	}),
	workRole: one(workRoles, {
		fields: [scheduleRequirements.workRoleId],
		references: [workRoles.id]
	}),
	shiftTemplate: one(shiftTemplates, {
		fields: [scheduleRequirements.shiftTemplateId],
		references: [shiftTemplates.id]
	}),
}));

export const workRolesRelations = relations(workRoles, ({many}) => ({
	scheduleRequirements: many(scheduleRequirements),
	employeeQualifications: many(employeeQualifications),
	employeeShiftAssignments: many(employeeShiftAssignments),
}));

export const shiftRosterPublicationsRelations = relations(shiftRosterPublications, ({one, many}) => ({
	branch: one(branches, {
		fields: [shiftRosterPublications.branchId],
		references: [branches.id]
	}),
	department: one(departments, {
		fields: [shiftRosterPublications.departmentId],
		references: [departments.id]
	}),
	user_submittedByUserId: one(users, {
		fields: [shiftRosterPublications.submittedByUserId],
		references: [users.id],
		relationName: "shiftRosterPublications_submittedByUserId_users_id"
	}),
	user_approvedByUserId: one(users, {
		fields: [shiftRosterPublications.approvedByUserId],
		references: [users.id],
		relationName: "shiftRosterPublications_approvedByUserId_users_id"
	}),
	user_rejectedByUserId: one(users, {
		fields: [shiftRosterPublications.rejectedByUserId],
		references: [users.id],
		relationName: "shiftRosterPublications_rejectedByUserId_users_id"
	}),
	user_publishedByUserId: one(users, {
		fields: [shiftRosterPublications.publishedByUserId],
		references: [users.id],
		relationName: "shiftRosterPublications_publishedByUserId_users_id"
	}),
	user_lockedByUserId: one(users, {
		fields: [shiftRosterPublications.lockedByUserId],
		references: [users.id],
		relationName: "shiftRosterPublications_lockedByUserId_users_id"
	}),
	shiftRosterVersionSnapshots: many(shiftRosterVersionSnapshots),
	shiftRosterLifecycleHistories: many(shiftRosterLifecycleHistory),
}));

export const shiftRosterVersionSnapshotsRelations = relations(shiftRosterVersionSnapshots, ({one}) => ({
	shiftRosterPublication: one(shiftRosterPublications, {
		fields: [shiftRosterVersionSnapshots.rosterPublicationId],
		references: [shiftRosterPublications.id]
	}),
	user: one(users, {
		fields: [shiftRosterVersionSnapshots.createdByUserId],
		references: [users.id]
	}),
}));

export const employeeQualificationsRelations = relations(employeeQualifications, ({one}) => ({
	employee: one(employees, {
		fields: [employeeQualifications.employeeId],
		references: [employees.id]
	}),
	workRole: one(workRoles, {
		fields: [employeeQualifications.positionId],
		references: [workRoles.id]
	}),
}));

export const employeeShiftAssignmentsRelations = relations(employeeShiftAssignments, ({one}) => ({
	shiftTemplate: one(shiftTemplates, {
		fields: [employeeShiftAssignments.shiftTemplateId],
		references: [shiftTemplates.id]
	}),
	employee: one(employees, {
		fields: [employeeShiftAssignments.employeeId],
		references: [employees.id]
	}),
	workRole: one(workRoles, {
		fields: [employeeShiftAssignments.positionId],
		references: [workRoles.id]
	}),
	location: one(locations, {
		fields: [employeeShiftAssignments.locationId],
		references: [locations.id]
	}),
	schedulesNew: one(schedulesNew, {
		fields: [employeeShiftAssignments.scheduleId],
		references: [schedulesNew.id]
	}),
	user: one(users, {
		fields: [employeeShiftAssignments.cancelledBy],
		references: [users.id]
	}),
}));

export const approvalStepsRelations = relations(approvalSteps, ({one}) => ({
	approvalRequest: one(approvalRequests, {
		fields: [approvalSteps.requestId],
		references: [approvalRequests.id]
	}),
	user_approverUserId: one(users, {
		fields: [approvalSteps.approverUserId],
		references: [users.id],
		relationName: "approvalSteps_approverUserId_users_id"
	}),
	user_decidedByUserId: one(users, {
		fields: [approvalSteps.decidedByUserId],
		references: [users.id],
		relationName: "approvalSteps_decidedByUserId_users_id"
	}),
}));

export const leaveApprovalLinksRelations = relations(leaveApprovalLinks, ({one}) => ({
	approvalRequest: one(approvalRequests, {
		fields: [leaveApprovalLinks.approvalRequestId],
		references: [approvalRequests.id]
	}),
	leaveRequest: one(leaveRequests, {
		fields: [leaveApprovalLinks.leaveRequestId],
		references: [leaveRequests.id]
	}),
	approvalPolicy: one(approvalPolicies, {
		fields: [leaveApprovalLinks.policyId],
		references: [approvalPolicies.id]
	}),
}));

export const chatConversationsRelations = relations(chatConversations, ({one, many}) => ({
	user: one(users, {
		fields: [chatConversations.createdByUserId],
		references: [users.id]
	}),
	chatMessageReads: many(chatMessageReads),
	chatMessages: many(chatMessages),
	chatParticipants: many(chatParticipants),
}));

export const chatMessageReadsRelations = relations(chatMessageReads, ({one}) => ({
	chatConversation: one(chatConversations, {
		fields: [chatMessageReads.conversationId],
		references: [chatConversations.id]
	}),
	user: one(users, {
		fields: [chatMessageReads.userId],
		references: [users.id]
	}),
	chatMessage: one(chatMessages, {
		fields: [chatMessageReads.lastReadMessageId],
		references: [chatMessages.id]
	}),
}));

export const chatMessagesRelations = relations(chatMessages, ({one, many}) => ({
	chatMessageReads: many(chatMessageReads),
	chatConversation: one(chatConversations, {
		fields: [chatMessages.conversationId],
		references: [chatConversations.id]
	}),
	user: one(users, {
		fields: [chatMessages.senderUserId],
		references: [users.id]
	}),
}));

export const chatParticipantsRelations = relations(chatParticipants, ({one}) => ({
	chatConversation: one(chatConversations, {
		fields: [chatParticipants.conversationId],
		references: [chatConversations.id]
	}),
	user: one(users, {
		fields: [chatParticipants.userId],
		references: [users.id]
	}),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({one}) => ({
	webhookSubscription: one(webhookSubscriptions, {
		fields: [webhookDeliveries.subscriptionId],
		references: [webhookSubscriptions.id]
	}),
}));

export const webhookSubscriptionsRelations = relations(webhookSubscriptions, ({many}) => ({
	webhookDeliveries: many(webhookDeliveries),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	branches: many(branches),
}));

export const shiftRosterLifecycleHistoryRelations = relations(shiftRosterLifecycleHistory, ({one}) => ({
	shiftRosterPublication: one(shiftRosterPublications, {
		fields: [shiftRosterLifecycleHistory.rosterPublicationId],
		references: [shiftRosterPublications.id]
	}),
	user: one(users, {
		fields: [shiftRosterLifecycleHistory.actorUserId],
		references: [users.id]
	}),
}));

export const workflowInstanceTransitionsRelations = relations(workflowInstanceTransitions, ({one}) => ({
	workflowInstance: one(workflowInstances, {
		fields: [workflowInstanceTransitions.instanceId],
		references: [workflowInstances.id]
	}),
	user: one(users, {
		fields: [workflowInstanceTransitions.actorUserId],
		references: [users.id]
	}),
}));

export const attendanceViolationsRelations = relations(attendanceViolations, ({one}) => ({
	attendanceSession: one(attendanceSessions, {
		fields: [attendanceViolations.sessionId],
		references: [attendanceSessions.id]
	}),
	employee: one(employees, {
		fields: [attendanceViolations.employeeId],
		references: [employees.id]
	}),
}));

export const permissionHierarchyRelations = relations(permissionHierarchy, ({one}) => ({
	permission_parentPermission: one(permissions, {
		fields: [permissionHierarchy.parentPermission],
		references: [permissions.code],
		relationName: "permissionHierarchy_parentPermission_permissions_code"
	}),
	permission_childPermission: one(permissions, {
		fields: [permissionHierarchy.childPermission],
		references: [permissions.code],
		relationName: "permissionHierarchy_childPermission_permissions_code"
	}),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionCode],
		references: [permissions.code]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user_userId: one(users, {
		fields: [userRoles.userId],
		references: [users.id],
		relationName: "userRoles_userId_users_id"
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	user_grantedBy: one(users, {
		fields: [userRoles.grantedBy],
		references: [users.id],
		relationName: "userRoles_grantedBy_users_id"
	}),
}));

export const userPermissionsRelations = relations(userPermissions, ({one}) => ({
	user_userId: one(users, {
		fields: [userPermissions.userId],
		references: [users.id],
		relationName: "userPermissions_userId_users_id"
	}),
	permission: one(permissions, {
		fields: [userPermissions.permissionCode],
		references: [permissions.code]
	}),
	user_grantedBy: one(users, {
		fields: [userPermissions.grantedBy],
		references: [users.id],
		relationName: "userPermissions_grantedBy_users_id"
	}),
}));