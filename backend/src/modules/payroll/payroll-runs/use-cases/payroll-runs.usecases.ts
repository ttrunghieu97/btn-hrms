import { Inject, Injectable } from "@nestjs/common";
import {
  throwBadRequest,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import {
  PayrollItemCreateInput,
  PayrollRunCreateInput,
  PayrollRunsRepository,
  PayrollRunTransaction,
  PayrollRunUpdateInput,
} from "../repositories/payroll-runs.repository";
import { PayrollRunMapper } from "../mappers/payroll-run.mapper";
import {
  CONTRACTS_TOKENS,
  TimeManagementPayrollPort,
  AttendanceReadPort,
  ATTENDANCE_PAY_POLICY,
  AttendancePayPolicy,
} from "../../../../contracts";
import { PayrollGeneratedEvent } from "../../../../core/events/events/payroll-generated.event";
import { PayrollProcessedEvent } from "../../../../core/events/events/payroll-processed.event";
import { getScopeId } from "../../../../shared/constants/system";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { PayrollRunQueryDto } from "../dto/payroll-run-query.dto";
import { CreatePayrollRunDto } from "../dto/create-payroll-run.dto";
import { UpdatePayrollRunDto } from "../dto/update-payroll-run.dto";

type PayslipInput = {
  payrollRunId: string;
  employeeId: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>  ;
};

type EmployeeCalculation = {
  employeeId: string;
  baseSalary: number;
  hourlyRate: number;
  overtimeAmount: number;
  overtimeMinutes: number;
  deduction: number;
  absentDays: number;
  payrollInputs: {
    type: string;
    amount?: number;
    quantity?: number;
    rate?: number;
    metadata?: Record<string, unknown>   | null;
  }[];
};

@Injectable()
export class ListPayrollRunsUseCase {
  constructor(private readonly repo: PayrollRunsRepository) {}
  async execute(query: PayrollRunQueryDto) {
    const result = await this.repo.list(query);
    return { ...result, rows: result.rows.map(PayrollRunMapper.toDto) };
  }
}

@Injectable()
export class GetPayrollRunUseCase {
  constructor(private readonly repo: PayrollRunsRepository) {}
  async execute(id: string) {
    const row = await this.repo.findById(id);
    if (!row)
      throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollRunId: id,
      });
    return PayrollRunMapper.toDto(row);
  }
}

@Injectable()
export class CreatePayrollRunUseCase {
  constructor(private readonly repo: PayrollRunsRepository) {}
  async execute(dto: CreatePayrollRunDto) {
    const row = await this.repo.create(
      PayrollRunMapper.toEntity({
        ...dto,
        status: dto.status ?? "draft",
      }) as PayrollRunCreateInput,
    );
    const created = await this.repo.findById(row!.id);
    return PayrollRunMapper.toDto(created!);
  }
}

@Injectable()
export class UpdatePayrollRunUseCase {
  constructor(private readonly repo: PayrollRunsRepository) {}
  async execute(id: string, dto: UpdatePayrollRunDto) {
    const existing = await this.repo.findById(id);
    if (!existing)
      throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollRunId: id,
      });
    await this.repo.update(
      id,
      PayrollRunMapper.toEntity(dto),
    );
    const updated = await this.repo.findById(id);
    return PayrollRunMapper.toDto(updated!);
  }
}

@Injectable()
export class GeneratePayrollRunUseCase {
  constructor(
    private readonly repo: PayrollRunsRepository,
    @Inject(CONTRACTS_TOKENS.TIME_MANAGEMENT_PAYROLL_PORT)
    private readonly payrollInputPort: TimeManagementPayrollPort,
    @Inject(CONTRACTS_TOKENS.ATTENDANCE_READ_PORT)
    private readonly attendanceReadPort: AttendanceReadPort,
    @Inject(ATTENDANCE_PAY_POLICY)
    private readonly payPolicy: AttendancePayPolicy,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(id: string) {
    const payrollRun = await this.repo.findById(id);
    if (!payrollRun) {
      throwNotFound("Payroll run not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollRunId: id,
      });
    }

    if (["approved", "paid", "closed", "pending_approval"].includes(payrollRun.status)) {
      throwBadRequest(
        "Payroll run cannot be regenerated after approval",
        ERROR_CODES.INVALID_REQUEST,
        { payrollRunId: id, status: payrollRun.status },
      );
    }

    const payrollPeriod = await this.repo.getPayrollPeriodById(
      payrollRun.payrollPeriodId,
    );
    if (!payrollPeriod) {
      throwNotFound("Payroll period not found", ERROR_CODES.PAYROLL_NOT_FOUND, {
        payrollPeriodId: payrollRun.payrollPeriodId,
      });
    }

    const employees = await this.repo.getEmployeesForPayrollRun({
      branchId: payrollRun.branchId,
    });

    const employeeIds = employees.map((employee) => employee.id);

    const periodKey = `${payrollPeriod.startsOn.slice(0, 7)}`;

    const salaryByEmployee = await this.repo.getCurrentSalaryByEmployee(
      employeeIds,
    );

    const rawSummaries = await this.attendanceReadPort.getEffectiveDailySummaries(
      employeeIds,
      payrollPeriod.startsOn,
      payrollPeriod.endsOn,
    );

    const attendanceByEmployee = new Map<string, typeof rawSummaries>();
    for (const row of rawSummaries) {
      const current = attendanceByEmployee.get(row.employeeId) ?? [];
      current.push(row);
      attendanceByEmployee.set(row.employeeId, current);
    }

    const batchPayrollInputs = await this.payrollInputPort.getBatchPayrollInputs({
      employeeIds,
      period: periodKey,
    });

    await this.repo.transaction(async (tx: PayrollRunTransaction) => {
      await this.repo.markRunProcessing(payrollRun.id, tx);
      await this.repo.deleteRunItems(payrollRun.id, tx);
      await this.repo.deleteRunPayslips(payrollRun.id, tx);

      const payslipInputs: PayslipInput[] = [];
      const employeeCalculations: EmployeeCalculation[] = [];

      for (const employee of employees) {
        const salary = salaryByEmployee.get(employee.id);
        if (!salary) continue;

        const summaries = attendanceByEmployee.get(employee.id) ?? [];
        
        let totalWorkedMinutes = 0;
        let totalOvertimeMinutes = 0;
        let absentDays = 0;

        for (const summary of summaries) {
          const payResult = this.payPolicy.evaluate(summary);
          totalWorkedMinutes += payResult.payableMinutes;
          totalOvertimeMinutes += payResult.payableOvertimeMinutes;

          if (payResult.attendanceOutcome === "absent") {
            absentDays++;
          }
        }

        const baseSalary = Number(salary.baseSalary ?? 0);
        const hourlyRate = baseSalary / 160;
        const overtimeAmount = Math.round(
          (totalOvertimeMinutes / 60) * hourlyRate * 1.5,
        );
        const deduction = Math.round((baseSalary / 22) * absentDays);
        const allowance = 0;
        const taxAmount = 0;
        const insuranceAmount = 0;
        const grossPay = baseSalary + allowance + overtimeAmount;
        const totalDeductions = deduction + taxAmount + insuranceAmount;
        const netPay = grossPay - totalDeductions;

        const rawInputs = batchPayrollInputs.get(employee.id) ?? [];
        const payrollInputs: EmployeeCalculation['payrollInputs'] = rawInputs.map((i: Record<string, unknown>  ) => ({
          type: i.type as string,
          amount: i.amount as number | undefined,
          quantity: i.quantity as number | undefined,
          rate: i.rate as number | undefined,
          metadata: i.metadata as Record<string, unknown>   | null | undefined,
        }));

        payslipInputs.push({
          payrollRunId: payrollRun.id,
          employeeId: employee.id,
          grossPay,
          totalDeductions,
          netPay,
          currency: salary.currency ?? "VND",
          status: "draft",
          metadata: {
            workedMinutes: totalWorkedMinutes,
            overtimeMinutes: totalOvertimeMinutes,
            absentDays,
          },
        });

        employeeCalculations.push({
          employeeId: employee.id,
          baseSalary,
          hourlyRate,
          overtimeAmount,
          overtimeMinutes: totalOvertimeMinutes,
          deduction,
          absentDays,
          payrollInputs,
        });
      }

      const createdPayslips = await this.repo.createPayslips(payslipInputs, tx);
      const payslipMap = new Map(createdPayslips.map((p) => [p.employeeId, p.id]));

      const allItemValues: PayrollItemCreateInput[] = [];
      const events: PayrollGeneratedEvent[] = [];

      for (const calc of employeeCalculations) {
        const payslipId = payslipMap.get(calc.employeeId);
        if (!payslipId) continue;

        allItemValues.push(
          {
            payrollRunId: payrollRun.id,
            employeeId: calc.employeeId,
            payslipId,
            type: "earning",
            code: "base_salary",
            name: "Base Salary",
            amount: String(calc.baseSalary),
            quantity: "1",
            rate: String(calc.baseSalary),
            metadata: { source: "salary_structure" },
          },
          {
            payrollRunId: payrollRun.id,
            employeeId: calc.employeeId,
            payslipId,
            type: "overtime",
            code: "overtime",
            name: "Overtime",
            amount: String(calc.overtimeAmount),
            quantity: String(calc.overtimeMinutes / 60),
            rate: String(calc.hourlyRate * 1.5),
            metadata: { source: "attendance_summary" },
          },
          {
            payrollRunId: payrollRun.id,
            employeeId: calc.employeeId,
            payslipId,
            type: "deduction",
            code: "absence_deduction",
            name: "Absence Deduction",
            amount: String(calc.deduction),
            quantity: String(calc.absentDays),
            rate: String(calc.baseSalary / 22),
            metadata: { source: "attendance_summary" },
          },
        );

        for (const input of calc.payrollInputs) {
          allItemValues.push({
            payrollRunId: payrollRun.id,
            employeeId: calc.employeeId,
            payslipId,
            type: input.type === "overtime_hours" ? "overtime" as const : "earning" as const,
            code: String(input.type),
            name: String(input.type),
            amount: String(input.amount ?? 0),
            quantity: String(input.quantity ?? 0),
            rate: input.rate !== undefined ? String(input.rate) : null,
            metadata: input.metadata ?? null,
          });
        }

        events.push(new PayrollGeneratedEvent(calc.employeeId, String(payslipId)));
      }

      if (allItemValues.length > 0) {
        await this.repo.createPayrollItems(allItemValues, tx);
      }

      for (const event of events) {
        await this.eventOutbox.stage(event, tx);
      }

      await this.repo.markRunPendingApproval(payrollRun.id, tx);

      await this.eventOutbox.stage(
        new PayrollProcessedEvent({
          scopeId: getScopeId(),
          payrollRunId: payrollRun.id,
          processedByUserId: null,
        }),
        tx,
      );
    });

    const generated = await this.repo.findById(id);
    return PayrollRunMapper.toDto(generated!);
  }
}



