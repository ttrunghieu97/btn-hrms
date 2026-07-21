import { formatDateISO } from "@/shared/utils/date-format";
import { Inject, Injectable } from "@nestjs/common";
import { IWorkforceFacade } from "../../../contracts/workforce/i-workforce.facade";
import { EmployeeSnapshotDto } from "../../../contracts/workforce/dtos/employee-snapshot.dto";
import { PositionSnapshotDto } from "../../../contracts/workforce/dtos/position-snapshot.dto";
import { EmployeeContractsRepository } from "../employee-contracts/repositories/employee-contracts.repository";
import { EmployeesRepository } from "../employees/repositories/employees.repository";
import { ShiftContextDto } from "../../../contracts/workforce/dtos/shift-context.dto";
import { calculateScheduledMinutes } from "../../scheduling/shifts/shift-catalog/services/shift-time.validator";
import { CONTRACTS_TOKENS } from "../../../contracts/contracts.tokens";
import type { DepartmentReaderPort } from "../../../contracts/ports/department-reader.port";
import type { PositionReaderPort } from "../../../contracts/ports/position-reader.port";
import type { EmployeeShiftReaderPort } from "../../../contracts/ports/employee-shift-reader.port";

@Injectable()
export class WorkforceFacade implements IWorkforceFacade {
  constructor(
    private readonly employeeRepo: EmployeesRepository,
    private readonly contractRepo: EmployeeContractsRepository,
    @Inject(CONTRACTS_TOKENS.DEPARTMENT_READER_PORT)
    private readonly departmentReader: DepartmentReaderPort,
    @Inject(CONTRACTS_TOKENS.POSITION_READER_PORT)
    private readonly positionReader: PositionReaderPort,
    @Inject(CONTRACTS_TOKENS.EMPLOYEE_SHIFT_READER_PORT)
    private readonly shiftReader: EmployeeShiftReaderPort,
  ) {}

  async getEmployeeAsOfDate(
    employeeId: string,
    _asOfDate: Date,
  ): Promise<EmployeeSnapshotDto> {
    const [emp] = await Promise.all([
      this.employeeRepo.findById(employeeId),
      this.contractRepo.getCurrent(employeeId),
    ]);

    if (!emp) throw new Error("Employee not found");

    return {
      employeeId: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      status: emp.status,
      positionId: undefined,
      salaryBase: undefined,
    };
  }

  async getDepartmentTree(_asOfDate: Date = new Date()): Promise<any> {
    return this.departmentReader.getTree();
  }

  async getPositionDetails(
    positionId: string,
    _asOfDate: Date,
  ): Promise<PositionSnapshotDto> {
    const pos = await this.positionReader.findById(positionId);
    if (!pos) throw new Error("Position not found");
    return {
      positionId: pos.id,
      title: pos.name,
      departmentId: undefined,
      jobFamilyId: undefined,
      gradeId: undefined,
    };
  }

  async getEmployeeShiftContext(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<ShiftContextDto[]> {
    const rows = await this.shiftReader.getEmployeeAssignmentsForRange(
      employeeId,
      formatDateISO(from),
      formatDateISO(to),
    );

    return rows.map((row) => ({
      assignmentId: row.id,
      shiftTemplateId: row.shiftTemplateId ?? undefined,
      effectiveFrom: row.effectiveFrom ?? row.assignmentDate,
      effectiveTo: row.effectiveTo ?? null,
      status: row.status,
      scheduledMinutes: row.shiftTemplate
        ? calculateScheduledMinutes({
            startTime: row.shiftTemplate.startTime,
            endTime: row.shiftTemplate.endTime,
            overnight: row.shiftTemplate.isNightShift,
            breakMinutes: row.shiftTemplate.breakMinutes ?? undefined,
          })
        : undefined,
    }));
  }
}



