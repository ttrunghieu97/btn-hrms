export interface PayrollSummary {
  totalGross: string;
  totalNet: string;
  totalDeductions: string;
  employeeCount: number;
  draftPayslipCount: number;
  publishedPayslipCount: number;
  latestPeriodName: string;
}

export interface PayrollCostTrend {
  periodId: string;
  periodName: string;
  totalGross: string;
  totalNet: string;
  employeeCount: number;
}

export interface RecentRun {
  id: string;
  status: string;
  periodName: string;
  createdAt: string;
  processedAt: string | null;
}

export interface DraftPayslip {
  id: string;
  employeeName: string;
  employeeCode: string;
  netPay: string;
  createdAt: string;
  payrollRunId: string;
}

export interface PayrollDashboardData {
  summary: PayrollSummary;
  trend: PayrollCostTrend[];
  recentRuns: RecentRun[];
  draftPayslips: DraftPayslip[];
}
