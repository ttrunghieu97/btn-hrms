import { queryOptions } from '@tanstack/react-query';
import { queryPolicyPresets } from '@/lib/query-client';
import { listExpenseClaims, getExpenseClaim } from './expenses';
import { expenseClaimKeys, type ExpenseClaimListFilters } from '../queries/expense-queries';

export const expenseClaimsQueryOptions = (filters?: ExpenseClaimListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: expenseClaimKeys.list(filters),
    queryFn: () => listExpenseClaims(filters as Record<string, unknown>),
  });

export const expenseClaimDetailQueryOptions = (id: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: expenseClaimKeys.detail(id),
    queryFn: () => getExpenseClaim(id),
    enabled: !!id,
  });
