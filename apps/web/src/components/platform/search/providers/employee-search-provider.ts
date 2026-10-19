import type { SearchProvider, SearchResult } from '../types';
import { employeesControllerFindAll } from '@/api/generated/employees-hr-management/employees-hr-management';
import { extractList } from '@/lib/api-extract';

interface EmployeeSearchItem {
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  departmentName?: string;
  positionName?: string;
}

/**
 * Employee search provider — queries the real employees endpoint.
 */
export const employeeSearchProvider: SearchProvider = {
  id: 'employees',
  label: 'Employees',
  search: async (query: string): Promise<SearchResult[]> => {
    const q = query.trim();
    if (!q) return [];
    try {
      const response = await employeesControllerFindAll({ search: q, limit: 5 });
      const items = extractList<EmployeeSearchItem>(response);
      return items
        .map((emp): SearchResult | null => {
          const identifier = emp.username || emp.id;
          if (!identifier) return null;
          const title =
            emp.fullName?.trim() ||
            [emp.lastName, emp.firstName].filter(Boolean).join(' ').trim() ||
            identifier;
          const subtitleParts = [emp.positionName, emp.departmentName, emp.email].filter(Boolean);
          return {
            id: String(identifier),
            type: 'employee',
            title,
            subtitle: subtitleParts.join(' — ') || undefined,
            href: `/employees/${encodeURIComponent(String(identifier))}`,
            permission: 'employees:view:all',
          };
        })
        .filter((item): item is SearchResult => item !== null);
    } catch {
      return [];
    }
  },
};
