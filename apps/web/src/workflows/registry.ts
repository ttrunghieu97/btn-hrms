import type { WorkflowDefinition } from './types';
import { employeeLifecycleWorkflow } from './employee-lifecycle.workflow';
import { leaveWorkflow } from './leave.workflow';
import { attendanceWorkflow } from './attendance.workflow';
import { payrollWorkflow } from './payroll.workflow';
import { performanceWorkflow } from './performance.workflow';
import { recruitmentWorkflow } from './recruitment.workflow';
import { onboardingWorkflow } from './onboarding.workflow';
import { offboardingWorkflow } from './offboarding.workflow';
import { expensesWorkflow } from './expenses.workflow';
import { contractsWorkflow } from './contracts.workflow';
import { assetRequestWorkflow } from './asset-request.workflow';
import { scheduleRequestsWorkflow } from './schedule-requests.workflow';

const WORKFLOW_REGISTRY = new Map<string, WorkflowDefinition>([
  ['employee-lifecycle', employeeLifecycleWorkflow],
  ['leave-request', leaveWorkflow],
  ['attendance-period', attendanceWorkflow],
  ['payroll-run', payrollWorkflow],
  ['performance-cycle', performanceWorkflow],
  ['recruitment-candidate', recruitmentWorkflow],
  ['onboarding-process', onboardingWorkflow],
  ['offboarding-process', offboardingWorkflow],
  ['expense-claim', expensesWorkflow],
  ['contract-lifecycle', contractsWorkflow],
  ['asset-request', assetRequestWorkflow],
  ['schedule-request', scheduleRequestsWorkflow],
]);

/**
 * Retrieve a workflow definition by its unique identifier.
 */
export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return WORKFLOW_REGISTRY.get(id);
}

/**
 * Retrieve all registered HRMS workflow definitions.
 */
export function getAllWorkflows(): WorkflowDefinition[] {
  return Array.from(WORKFLOW_REGISTRY.values());
}

export {
  employeeLifecycleWorkflow,
  leaveWorkflow,
  attendanceWorkflow,
  payrollWorkflow,
  performanceWorkflow,
  recruitmentWorkflow,
  onboardingWorkflow,
  offboardingWorkflow,
  expensesWorkflow,
  contractsWorkflow,
  assetRequestWorkflow,
  scheduleRequestsWorkflow,
};
