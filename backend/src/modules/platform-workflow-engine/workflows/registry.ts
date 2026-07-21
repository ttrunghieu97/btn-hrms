import { EXPENSE_APPROVAL_WORKFLOW } from "./expense-approval.workflow";
import { HIRING_WORKFLOW } from "./hiring.workflow";
import { LEAVE_APPROVAL_WORKFLOW } from "./leave-approval.workflow";
import { PAYROLL_APPROVAL_WORKFLOW } from "./payroll-approval.workflow";
import { PERFORMANCE_WORKFLOW } from "./performance.workflow";
import { PROMOTION_WORKFLOW } from "./promotion.workflow";
import { TRANSFER_WORKFLOW } from "./transfer.workflow";
import { TERMINATION_WORKFLOW } from "./termination.workflow";
import { type WorkflowDefinitionConfig } from "./types";

export const WORKFLOW_DEFINITIONS: WorkflowDefinitionConfig[] = [
  HIRING_WORKFLOW,
  LEAVE_APPROVAL_WORKFLOW,
  EXPENSE_APPROVAL_WORKFLOW,
  PAYROLL_APPROVAL_WORKFLOW,
  PERFORMANCE_WORKFLOW,
  PROMOTION_WORKFLOW,
  TRANSFER_WORKFLOW,
  TERMINATION_WORKFLOW,
];

