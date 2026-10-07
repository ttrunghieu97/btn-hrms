'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { TimesheetWorkspaceEmployee } from '../types';
import { showToast } from '@/lib/toast';

export interface UseEmployeeUrlSyncOptions {
  employees: TimesheetWorkspaceEmployee[];
  loading?: boolean;
}

export interface UseEmployeeUrlSyncReturn {
  selectedEmployee: TimesheetWorkspaceEmployee | null;
  selectedId: string;
  selectEmployee: (emp: TimesheetWorkspaceEmployee) => void;
  selectById: (idOrCode: string) => void;
}

/**
 * Enterprise URL Synchronization Hook for Timesheet Workspace
 * - Bidirectional synchronization between URL query param (?employeeId=...) and active employee
 * - Treats Backend as the authoritative Source of Truth: validates URL params against fetched permissions/employees
 * - Automatic graceful fallback with accessible toast alert if user enters an invalid or unauthorized employee
 * - Seamless Next.js shallow navigation (scroll: false) without full-page remount or data re-fetch
 * - Handles browser History navigation (Back / Forward)
 */
export function useEmployeeUrlSync({
  employees,
  loading = false,
}: UseEmployeeUrlSyncOptions): UseEmployeeUrlSyncReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query parameters (?employeeId=... or aliases ?emp=..., ?code=...)
  const urlParam =
    searchParams.get('employeeId') ||
    searchParams.get('emp') ||
    searchParams.get('code') ||
    '';

  // Helper to match an employee by ID (UUID) or employeeCode (case-insensitive)
  const findEmployee = React.useCallback(
    (key: string): TimesheetWorkspaceEmployee | undefined => {
      if (!key) return undefined;
      const normalized = key.trim().toLowerCase();
      return employees.find(
        (e) =>
          e.id.toLowerCase() === normalized ||
          (e.employeeCode && e.employeeCode.toLowerCase() === normalized),
      );
    },
    [employees],
  );

  // Initialize selection
  const [selectedId, setSelectedId] = React.useState<string>(() => {
    if (urlParam) {
      const match = findEmployee(urlParam);
      if (match) return match.id;
    }
    return employees[0]?.id ?? '';
  });

  // Track the last synced URL param to prevent redundant replace calls
  const lastSyncedUrlParamRef = React.useRef<string | null>(null);
  const warnedParamRef = React.useRef<string | null>(null);

  // Synchronize state when URL param or employees list changes (Source of Truth Reconciliation)
  React.useEffect(() => {
    if (loading || employees.length === 0) return;

    if (urlParam) {
      const matched = findEmployee(urlParam);
      if (matched) {
        if (matched.id !== selectedId) {
          setSelectedId(matched.id);
        }
        lastSyncedUrlParamRef.current = matched.employeeCode || matched.id;
        warnedParamRef.current = null;
      } else {
        // Backend Source of Truth: the requested employee does NOT exist or user lacks access.
        const fallback = employees[0];
        if (fallback) {
          setSelectedId(fallback.id);
          const fallbackTarget = fallback.employeeCode || fallback.id;

          if (warnedParamRef.current !== urlParam) {
            showToast.warning(
              `Nhân viên "${urlParam}" không tồn tại hoặc bạn không có quyền xem trong kỳ này. Đã chuyển về nhân viên hợp lệ.`,
            );
            warnedParamRef.current = urlParam;
          }

          // Sanitize URL to valid employee
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.set('employeeId', fallbackTarget);
          nextParams.delete('emp');
          nextParams.delete('code');
          lastSyncedUrlParamRef.current = fallbackTarget;
          router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
        }
      }
    } else {
      // No employee param on URL -> default to first employee and sync URL
      const defaultEmp = employees.find((e) => e.id === selectedId) ?? employees[0];
      if (defaultEmp) {
        if (defaultEmp.id !== selectedId) {
          setSelectedId(defaultEmp.id);
        }
        const targetParam = defaultEmp.employeeCode || defaultEmp.id;
        if (lastSyncedUrlParamRef.current !== targetParam) {
          lastSyncedUrlParamRef.current = targetParam;
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.set('employeeId', targetParam);
          router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
        }
      }
    }
  }, [urlParam, employees, loading, findEmployee, pathname, router, searchParams, selectedId]);

  // Handler to select an employee and push to URL history
  const selectEmployee = React.useCallback(
    (emp: TimesheetWorkspaceEmployee) => {
      setSelectedId(emp.id);
      const targetParam = emp.employeeCode || emp.id;

      if (lastSyncedUrlParamRef.current !== targetParam) {
        lastSyncedUrlParamRef.current = targetParam;
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set('employeeId', targetParam);
        nextParams.delete('emp');
        nextParams.delete('code');
        router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
      }
    },
    [pathname, router, searchParams],
  );

  const selectById = React.useCallback(
    (idOrCode: string) => {
      const match = findEmployee(idOrCode);
      if (match) {
        selectEmployee(match);
      }
    },
    [findEmployee, selectEmployee],
  );

  const selectedEmployee = React.useMemo(() => {
    return employees.find((e) => e.id === selectedId) ?? employees[0] ?? null;
  }, [employees, selectedId]);

  return {
    selectedEmployee,
    selectedId: selectedEmployee?.id ?? '',
    selectEmployee,
    selectById,
  };
}
