export interface PayrollPeriodInfo {
  id: string;
  status: string;
  startsOn: string;
  endsOn: string;
}

export interface IPayrollPeriodReaderPort {
  findLockedPeriod(date: string): Promise<PayrollPeriodInfo | null>;
}

export const PAYROLL_PERIOD_READER_PORT = "PAYROLL_PERIOD_READER_PORT";
