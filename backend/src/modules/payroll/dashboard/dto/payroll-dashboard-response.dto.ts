import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class PayrollSummaryDto {
  @ApiProperty()
  totalGross: string;

  @ApiProperty()
  totalNet: string;

  @ApiProperty()
  totalDeductions: string;

  @ApiProperty()
  employeeCount: number;

  @ApiProperty()
  draftPayslipCount: number;

  @ApiProperty()
  publishedPayslipCount: number;

  @ApiProperty()
  latestPeriodName: string;
}

class PayrollCostTrendDto {
  @ApiProperty()
  periodId: string;

  @ApiProperty()
  periodName: string;

  @ApiProperty()
  totalGross: string;

  @ApiProperty()
  totalNet: string;

  @ApiProperty()
  employeeCount: number;
}

class RecentRunDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  periodName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  processedAt?: Date | null;
}

class DraftPayslipDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  employeeName: string;

  @ApiProperty()
  employeeCode: string;

  @ApiProperty()
  netPay: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  payrollRunId: string;
}

export class PayrollDashboardResponseDto {
  @ApiProperty({ type: PayrollSummaryDto })
  summary: PayrollSummaryDto;

  @ApiProperty({ type: [PayrollCostTrendDto] })
  trend: PayrollCostTrendDto[];

  @ApiProperty({ type: [RecentRunDto] })
  recentRuns: RecentRunDto[];

  @ApiProperty({ type: [DraftPayslipDto] })
  draftPayslips: DraftPayslipDto[];
}
