import type { SearchProvider, SearchResult } from '../types';

/**
 * Employee search provider.
 * Phase 1: mock data filtered by query. Phase 2: API-backed.
 */
const mockEmployees: SearchResult[] = [
  { id: 'emp-1', type: 'employee', title: 'Nguyen Van A', subtitle: 'Software Engineer — Engineering', href: '/employees/emp-1', permission: 'employee:view' },
  { id: 'emp-2', type: 'employee', title: 'Tran Thi B', subtitle: 'HR Manager — Human Resources', href: '/employees/emp-2', permission: 'employee:view' },
  { id: 'emp-3', type: 'employee', title: 'Le Van C', subtitle: 'Accountant — Finance', href: '/employees/emp-3', permission: 'employee:view' },
  { id: 'emp-4', type: 'employee', title: 'Pham Thi D', subtitle: 'Team Lead — Engineering', href: '/employees/emp-4', permission: 'employee:view' },
  { id: 'emp-5', type: 'employee', title: 'Hoang Van E', subtitle: 'Product Manager — Product', href: '/employees/emp-5', permission: 'employee:view' },
];

export const employeeSearchProvider: SearchProvider = {
  id: 'employees',
  label: 'Employees',
  search: async (query: string): Promise<SearchResult[]> => {
    const q = query.toLowerCase();
    return mockEmployees.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.subtitle ?? '').toLowerCase().includes(q),
    );
  },
};
