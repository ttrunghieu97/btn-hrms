'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
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

function readEmployeeParamFromSearch(search: URLSearchParams): string {
  return (
    search.get('employeeId') ||
    search.get('emp') ||
    search.get('code') ||
    ''
  );
}

function getMergedSearchParams(searchParamsStr: string): URLSearchParams {
  if (typeof window === 'undefined' || !window.location.search) {
    return new URLSearchParams(searchParamsStr);
  }
  const merged = new URLSearchParams(window.location.search);
  if (searchParamsStr) {
    const fromHook = new URLSearchParams(searchParamsStr);
    fromHook.forEach((val, key) => {
      if (key !== 'employeeId' && key !== 'emp' && key !== 'code') {
        merged.set(key, val);
      }
    });
  }
  return merged;
}

function buildEmployeeUrl(
  pathname: string,
  searchParamsStr: string,
  targetParam: string,
): string {
  const effectivePathname =
    typeof window !== 'undefined' && window.location.pathname
      ? window.location.pathname
      : pathname;
  const nextParams = getMergedSearchParams(searchParamsStr);
  nextParams.set('employeeId', targetParam);
  nextParams.delete('emp');
  nextParams.delete('code');
  const query = nextParams.toString();
  return query ? `${effectivePathname}?${query}` : effectivePathname;
}

/**
 * Enterprise URL Synchronization Hook for Timesheet Workspace
 * - Bidirectional synchronization between URL query param (?employeeId=...) and active employee
 * - Treats Backend as the authoritative Source of Truth: validates URL params against fetched permissions/employees
 * - Automatic graceful fallback with accessible toast alert if user enters an invalid or unauthorized employee
 * - Uses shallow History API (pushState / replaceState) + popstate to avoid redundant Next.js RSC roundtrips
 * - Handles browser History navigation (Back / Forward) and deep-link initialization
 */
export function useEmployeeUrlSync({
  employees,
  loading = false,
}: UseEmployeeUrlSyncOptions): UseEmployeeUrlSyncReturn {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query parameters (?employeeId=... or aliases ?emp=..., ?code=...)
  const urlParam = readEmployeeParamFromSearch(searchParams);

  // Build O(1) lookup map by normalized id and employeeCode
  const employeeLookup = React.useMemo(() => {
    const map = new Map<string, TimesheetWorkspaceEmployee>();
    for (const emp of employees) {
      map.set(emp.id.toLowerCase(), emp);
      if (emp.employeeCode) {
        map.set(emp.employeeCode.toLowerCase(), emp);
      }
    }
    return map;
  }, [employees]);

  const findEmployee = React.useCallback(
    (key: string): TimesheetWorkspaceEmployee | undefined => {
      if (!key) return undefined;
      return employeeLookup.get(key.trim().toLowerCase());
    },
    [employeeLookup],
  );

  // Initialize selection synchronously on first render
  const [selectedId, setSelectedId] = React.useState<string>(() => {
    if (urlParam) {
      const match = employeeLookup.get(urlParam.trim().toLowerCase());
      if (match) return match.id;
    }
    return employees[0]?.id ?? '';
  });

  const selectedIdRef = React.useRef(selectedId);
  selectedIdRef.current = selectedId;

  // Track the last synced URL param to prevent redundant history updates or URL -> state -> URL loops
  const lastSyncedUrlParamRef = React.useRef<string | null>(null);
  const prevExternalUrlParamRef = React.useRef<string | null>(null);
  const warnedParamRef = React.useRef<string | null>(null);

  // Reconcile state when external URL param or employees list changes
  React.useEffect(() => {
    if (loading || employees.length === 0) return;

    const urlChanged =
      prevExternalUrlParamRef.current !== urlParam &&
      urlParam !== lastSyncedUrlParamRef.current;
    prevExternalUrlParamRef.current = urlParam;

    if (urlParam) {
      // If urlParam did not externally change since last reconciliation and user already selected an employee in-memory,
      // preserve the active in-memory selection (prevents stale searchParams from reverting user click).
      if (
        !urlChanged &&
        selectedIdRef.current &&
        employees.some((e) => e.id === selectedIdRef.current)
      ) {
        return;
      }

      const matched = findEmployee(urlParam);
      if (matched) {
        if (matched.id !== selectedIdRef.current) {
          setSelectedId(matched.id);
        }
        lastSyncedUrlParamRef.current = matched.employeeCode || matched.id;
        warnedParamRef.current = null;
      } else {
        // Backend Source of Truth: the requested employee does NOT exist or user lacks access.
        const fallback = employees[0];
        if (fallback) {
          if (fallback.id !== selectedIdRef.current) {
            setSelectedId(fallback.id);
          }
          const fallbackTarget = fallback.employeeCode || fallback.id;

          if (warnedParamRef.current !== urlParam) {
            showToast.warning(
              `Nhân viên "${urlParam}" không tồn tại hoặc bạn không có quyền xem trong kỳ này. Đã chuyển về nhân viên hợp lệ.`,
            );
            warnedParamRef.current = urlParam;
          }

          lastSyncedUrlParamRef.current = fallbackTarget;
          if (typeof window !== 'undefined') {
            const nextUrl = buildEmployeeUrl(
              pathname,
              searchParams.toString(),
              fallbackTarget,
            );
            window.history.replaceState(window.history.state, '', nextUrl);
          }
        }
      }
    } else {
      // No employee param on URL -> default to current valid selection or first employee and sync URL in-place
      const defaultEmp =
        employees.find((e) => e.id === selectedIdRef.current) ?? employees[0];
      if (defaultEmp) {
        if (defaultEmp.id !== selectedIdRef.current) {
          setSelectedId(defaultEmp.id);
        }
        const targetParam = defaultEmp.employeeCode || defaultEmp.id;
        lastSyncedUrlParamRef.current = targetParam;
        prevExternalUrlParamRef.current = targetParam;
        if (typeof window !== 'undefined') {
          const nextUrl = buildEmployeeUrl(
            pathname,
            searchParams.toString(),
            targetParam,
          );
          const currentUrl = `${window.location.pathname}${window.location.search}`;
          if (currentUrl !== nextUrl) {
            window.history.replaceState(window.history.state, '', nextUrl);
          }
        }
      }
    }
  }, [urlParam, employees, loading, findEmployee, pathname, searchParams]);

  // Listen to browser Back / Forward (popstate) for instant client restoration
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const popParam = readEmployeeParamFromSearch(params);
      prevExternalUrlParamRef.current = popParam;
      if (popParam) {
        const matched = findEmployee(popParam);
        if (matched) {
          lastSyncedUrlParamRef.current = matched.employeeCode || matched.id;
          if (matched.id !== selectedIdRef.current) {
            setSelectedId(matched.id);
          }
          return;
        }
      }
      const fallback = employees[0];
      if (fallback && fallback.id !== selectedIdRef.current) {
        lastSyncedUrlParamRef.current = fallback.employeeCode || fallback.id;
        setSelectedId(fallback.id);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [employees, findEmployee]);

  // Handler to select an employee and push to browser URL history without triggering RSC fetch
  const selectEmployee = React.useCallback(
    (emp: TimesheetWorkspaceEmployee) => {
      if (emp.id !== selectedIdRef.current) {
        selectedIdRef.current = emp.id;
        setSelectedId(emp.id);
      }
      const targetParam = emp.employeeCode || emp.id;

      if (lastSyncedUrlParamRef.current !== targetParam) {
        lastSyncedUrlParamRef.current = targetParam;
        if (typeof window !== 'undefined') {
          const nextUrl = buildEmployeeUrl(
            pathname,
            searchParams.toString(),
            targetParam,
          );
          const currentUrl = `${window.location.pathname}${window.location.search}`;
          if (currentUrl !== nextUrl) {
            window.history.pushState(window.history.state, '', nextUrl);
          }
        }
      }
    },
    [pathname, searchParams],
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
    if (selectedId) {
      const matched = employeeLookup.get(selectedId.toLowerCase());
      if (matched) return matched;
    }
    if (urlParam) {
      const urlMatched = employeeLookup.get(urlParam.trim().toLowerCase());
      if (urlMatched) return urlMatched;
    }
    return employees[0] ?? null;
  }, [employeeLookup, employees, selectedId, urlParam]);

  return {
    selectedEmployee,
    selectedId: selectedEmployee?.id ?? '',
    selectEmployee,
    selectById,
  };
}
