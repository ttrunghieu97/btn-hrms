import { createKeyFactory } from '@/lib/query-keys';

export type ExpenseClaimListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed' | 'closed';
  employeeId?: string;
};

export const expenseClaimKeys = createKeyFactory<ExpenseClaimListFilters>('expense-claims');
