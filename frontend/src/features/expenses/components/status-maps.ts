import type { StatusMap } from '@/components/ui/status-badge';
import { expensesUiCopy } from '@/locales/vi/app-copy';

export const CLAIM_STATUS_MAP: StatusMap = {
  draft: { label: expensesUiCopy.claimStatus.draft, variant: 'outline' },
  submitted: { label: expensesUiCopy.claimStatus.submitted, variant: 'secondary' },
  approved: { label: expensesUiCopy.claimStatus.approved, variant: 'default' },
  rejected: { label: expensesUiCopy.claimStatus.rejected, variant: 'destructive' },
  reimbursed: { label: expensesUiCopy.claimStatus.reimbursed, variant: 'default' },
  closed: { label: expensesUiCopy.claimStatus.closed, variant: 'outline' },
};

export interface ExpenseClaimRow {
  id: string;
  employeeId?: string;
  employeeName?: string;
  title?: string;
  status?: string;
  totalAmount?: string;
  currency?: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
}

export interface ExpenseClaimDetailRow extends ExpenseClaimRow {
  description?: string | null;
  items?: ExpenseClaimItemRow[];
}

export interface ExpenseClaimItemRow {
  id: string;
  claimId?: string;
  description?: string;
  amount?: string;
  expenseDate?: string;
  categoryId?: string | null;
}
