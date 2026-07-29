import { useState, useEffect, useCallback } from 'react';
import {
  type TimesheetWorkspaceEmployee,
  type TimesheetWorkspaceRecord,
  type TimesheetWorkspacePeriodTotals,
  type TimesheetWorkspaceResponse,
  type PeriodStatus,
} from '../types';

const WS_URL = '/api/v1/timekeeping/timesheet-workspace';

export interface TimesheetState {
  loading: boolean;
  error: string | null;
  employees: TimesheetWorkspaceEmployee[];
  records: TimesheetWorkspaceRecord[];
  periodStatus: PeriodStatus | null;
  availableActions: string[];
  totals: TimesheetWorkspacePeriodTotals | null;
  period: string;
  reload: () => Promise<void>;
  setPeriod: (period: string) => void;
}

export function useTimesheet(initialPeriod?: string): TimesheetState {
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState(initialPeriod ?? defaultPeriod);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<TimesheetWorkspaceEmployee[]>([]);
  const [records, setRecords] = useState<TimesheetWorkspaceRecord[]>([]);
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus | null>(null);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [totals, setTotals] = useState<TimesheetWorkspacePeriodTotals | null>(null);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ period: p });
      const res = await fetch(`${WS_URL}?${params}`);

      if (!res.ok) {
        setError(`Failed to load workspace: ${res.status}`);
        return;
      }

      const body = await res.json();
      const data: TimesheetWorkspaceResponse = body.data ?? body;
      setEmployees(data.employees ?? []);
      setRecords(data.records ?? []);
      setPeriodStatus(data.periodStatus ?? null);
      setAvailableActions(data.availableActions ?? []);
      setTotals(data.totals ?? null);
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(period);
  }, [period, fetchData]);

  const reload = useCallback(async () => {
    await fetchData(period);
  }, [period, fetchData]);

  return { loading, error, employees, records, periodStatus, availableActions, totals, period, reload, setPeriod };
}
