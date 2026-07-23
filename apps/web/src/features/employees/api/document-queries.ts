import { useQuery } from '@tanstack/react-query';
import {
  documentsControllerFindAll,
} from '@/api/generated/endpoints';
import { queryPolicyPresets } from '@/lib/query-client';
import { createKeyFactory } from '@/lib/query-keys';

export const documentKeys = createKeyFactory<Record<string, unknown>>('documents');

export interface DocumentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  departmentName: string | null;
  documentType: string;
  fileId: string;
  fileUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function useDocumentsListQuery(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: async () => {
      const sp = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== false) sp.set(k, String(v));
      });
      return documentsControllerFindAll(Object.fromEntries(sp) as any);
    },
    ...queryPolicyPresets.employees,
  });
}
