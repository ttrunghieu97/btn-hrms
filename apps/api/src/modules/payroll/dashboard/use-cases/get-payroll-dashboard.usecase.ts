import { Injectable } from "@nestjs/common";
import { PayrollDashboardResponseDto } from "../dto/payroll-dashboard-response.dto";
import { PayrollDashboardRepository } from "../repositories/payroll-dashboard.repository";

@Injectable()
export class GetPayrollDashboardUseCase {
  constructor(
    private readonly repo: PayrollDashboardRepository,
  ) {}

  async execute(): Promise<PayrollDashboardResponseDto> {
    const [
      latestPeriodName,
      payslipStats,
      recentRuns,
      draftPayslips,
      trend,
    ] = await Promise.all([
      this.repo.getLatestPeriodName(),
      this.repo.getPayslipStats(),
      this.repo.getRecentRuns(),
      this.repo.getDraftPayslips(),
      this.repo.getCostTrend(),
    ]);

    return {
      summary: {
        totalGross: payslipStats.totalGross ?? "0",
        totalNet: payslipStats.totalNet ?? "0",
        totalDeductions: payslipStats.totalDeductions ?? "0",
        employeeCount: Number(payslipStats.employeeCount ?? 0),
        draftPayslipCount: Number(payslipStats.draftCount ?? 0),
        publishedPayslipCount: Number(payslipStats.publishedCount ?? 0),
        latestPeriodName,
      },
      trend: trend.map((t) => ({
        periodId: t.periodId,
        periodName: t.periodName ?? "—",
        totalGross: String(t.totalGross ?? 0),
        totalNet: "0",
        employeeCount: Number(t.employeeCount ?? 0),
      })),
      recentRuns: recentRuns.map((r) => ({
        id: r.id,
        status: r.status,
        periodName: r.periodName ?? "—",
        createdAt: r.createdAt,
        processedAt: r.processedAt,
      })),
      draftPayslips: draftPayslips.map((p) => ({
        id: p.id,
        employeeName: p.employeeName,
        employeeCode: p.employeeCode ?? "—",
        netPay: p.netPay ?? "0",
        createdAt: p.createdAt,
        payrollRunId: p.payrollRunId ?? "",
      })),
    };
  }
}
