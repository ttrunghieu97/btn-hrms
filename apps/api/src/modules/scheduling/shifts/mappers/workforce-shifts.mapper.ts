import type { CancelEmployeeShiftAssignmentDto } from '../dto/cancel-employee-shift-assignment.dto';
import type { CreateEmployeeShiftAssignmentDto } from '../dto/create-employee-shift-assignment.dto';
import type { CreateWorkforceShiftTemplateDto } from '../dto/create-workforce-shift-template.dto';
import type { UpdateEmployeeShiftAssignmentDto } from '../dto/update-employee-shift-assignment.dto';
import type { UpdateWorkforceShiftTemplateDto } from '../dto/update-workforce-shift-template.dto';
import type {
  ShiftAssignmentRecord,
  ShiftTemplateCreateValues,
  ShiftTemplateRecord,
  ShiftTemplateUpdateValues
} from '../schedule-roster/repositories/workforce-shifts.repository.contract';

type ShiftTemplateEntityInput = Partial<
  CreateWorkforceShiftTemplateDto &
    UpdateWorkforceShiftTemplateDto & {
      isActive: boolean;
    }
>;

type ShiftAssignmentEntityInput = Partial<
  CreateEmployeeShiftAssignmentDto &
    UpdateEmployeeShiftAssignmentDto &
    CancelEmployeeShiftAssignmentDto & {
      cancelledAt: Date;
    }
>;

export class WorkforceShiftsMapper {
  static toTemplateEntity(
    dto: ShiftTemplateEntityInput
  ): ShiftTemplateCreateValues | ShiftTemplateUpdateValues {
    return {
      ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
      ...(dto.locationId !== undefined
        ? { locationId: dto.locationId }
        : {}),
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
      ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
      ...(dto.breakMinutes !== undefined
        ? { breakMinutes: dto.breakMinutes }
        : {}),
      ...(dto.activeWeekdays !== undefined
        ? { workDays: dto.activeWeekdays }
        : {}),
      ...(dto.overnight !== undefined ? { isNightShift: dto.overnight } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
    };
  }

  static toTemplateDto(row: ShiftTemplateRecord) {
    return {
      id: row.id,
      branchId: row.branchId ?? null,
      locationId: row.locationId ?? null,
      code: row.code,
      name: row.name,
      startTime: row.startTime,
      endTime: row.endTime,
      breakMinutes: row.breakMinutes,
      activeWeekdays: row.workDays ?? [],
      overnight: row.isNightShift,
      status: row.isActive ? 'published' : 'archived',
      version: 1,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  static toAssignmentEntity(dto: ShiftAssignmentEntityInput) {
    return {
      ...(dto.employeeId !== undefined ? { employeeId: dto.employeeId } : {}),
      ...(dto.shiftTemplateId !== undefined
        ? { shiftTemplateId: dto.shiftTemplateId }
        : {}),
      ...(dto.positionId !== undefined
        ? { positionId: dto.positionId }
        : {}),
      ...(dto.locationId !== undefined
        ? { locationId: dto.locationId }
        : {}),
      ...(dto.effectiveFrom !== undefined
        ? {
            effectiveFrom: dto.effectiveFrom,
            assignmentDate: dto.effectiveFrom
          }
        : {}),
      ...(dto.effectiveTo !== undefined
        ? { effectiveTo: dto.effectiveTo }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
      ...(dto.cancelledAt !== undefined ? { cancelledAt: dto.cancelledAt } : {})
    };
  }

  static toAssignmentDto(row: ShiftAssignmentRecord) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      shiftTemplateId: row.shiftTemplateId ?? null,
      positionId: row.positionId ?? null,
      locationId: row.locationId ?? null,
      effectiveFrom: row.effectiveFrom ?? row.assignmentDate ?? null,
      effectiveTo: row.effectiveTo ?? null,
      status: row.status,
      note: row.note ?? null,
      cancelledAt: row.cancelledAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      employee: row.employee
        ? {
            id: row.employee.id,
            employeeCode: row.employee.employeeCode ?? null,
            fullName:
              `${row.employee.firstName ?? ''} ${row.employee.lastName ?? ''}`.trim(),
            departmentId: row.employee.departmentId ?? null
          }
        : undefined,
      shiftTemplate: row.shiftTemplate
        ? {
            id: row.shiftTemplate.id,
            code: row.shiftTemplate.code,
            name: row.shiftTemplate.name,
            startTime: row.shiftTemplate.startTime,
            endTime: row.shiftTemplate.endTime,
            breakMinutes: row.shiftTemplate.breakMinutes
          }
        : undefined
    };
  }
}

