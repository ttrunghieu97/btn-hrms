export interface TimeManagementPayrollPort {
  getPayrollInputs(params: {
    employeeId: string;
    period: string;
  }): Promise<Record<string, unknown>[]>;

  getBatchPayrollInputs(params: {
    employeeIds: string[];
    period: string;
  }): Promise<Map<string, Record<string, unknown>[]>>;

  requestPayrollRecompute(periodId: string): Promise<{ accepted: boolean }>;
}
