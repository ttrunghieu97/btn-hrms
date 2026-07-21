import { Injectable } from '@nestjs/common';
import { type DataScope } from '../../../../../../core/security/types/data-scope.interface';
import { ERROR_CODES } from '../../../../../../shared/constants/error-codes';
import { throwBadRequest, throwConflict, throwNotFound } from '../../../../../../shared/utils/http-error';
import { CancelEmployeeShiftAssignmentDto } from '../../../dto/cancel-employee-shift-assignment.dto';
import { CreateEmployeeShiftAssignmentDto } from '../../../dto/create-employee-shift-assignment.dto';
import { EmployeeShiftAssignmentQueryDto } from '../../../dto/employee-shift-assignment-query.dto';
import { UpdateEmployeeShiftAssignmentDto } from '../../../dto/update-employee-shift-assignment.dto';
import { WorkforceShiftsMapper } from '../../../mappers/workforce-shifts.mapper';
import {
  type ShiftAssignmentConflictRecord,
  type ShiftAssignmentCreateValues,
  type ShiftAssignmentRecord
} from '../../repositories/workforce-shifts.repository.contract';
import { WorkforceShiftsRepository } from '../../repositories/workforce-shifts.repository';
import { ShiftValidationService } from '../../services/shift-validation.service';
import { ShiftRosterLockService } from '../../services/shift-roster-lock.service';
import { EventOutboxService } from '../../../../../../core/events/event-outbox.service';
import { AssignmentCreatedEvent } from '../../../../../../core/events/events/assignment-created.event';
import { AssignmentCancelledEvent } from '../../../../../../core/events/events/assignment-cancelled.event';
import { calculateScheduledMinutes } from '../../../shift-catalog/services/shift-time.validator';

function toConflictRanges(rows: ShiftAssignmentConflictRecord[]) {
  return rows.filter(
    (row): row is { effectiveFrom: string; effectiveTo: string | null } =>
      typeof row.effectiveFrom === 'string'
  );
}

function assertAssignment(
  row: ShiftAssignmentRecord | null,
  id: string
): ShiftAssignmentRecord {
  if (!row) {
    throwNotFound('Shift assignment not found', ERROR_CODES.SCHEDULE_NOT_FOUND, {
      shiftAssignmentId: id
    });
  }

  return row;
}

@Injectable()
export class ListEmployeeShiftAssignmentsUseCase {
  constructor(private readonly repo: WorkforceShiftsRepository) {}

  async execute(query: EmployeeShiftAssignmentQueryDto, scope?: DataScope) {
    const result = await this.repo.listShiftAssignments(query, scope);
    return {
      ...result,
      rows: result.rows.map(WorkforceShiftsMapper.toAssignmentDto)
    };
  }
}

@Injectable()
export class CreateEmployeeShiftAssignmentUseCase {
  constructor(
    private readonly repo: WorkforceShiftsRepository,
    private readonly validationService: ShiftValidationService,
    private readonly rosterLock: ShiftRosterLockService,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(dto: CreateEmployeeShiftAssignmentDto, scope?: DataScope) {
    const template = await this.repo.findShiftTemplateById(dto.shiftTemplateId);
    if (!template || template.isActive === false) {
      throwBadRequest(
        'Cannot assign archived or inactive shift template',
        ERROR_CODES.SHIFT_TEMPLATE_INACTIVE,
        { shiftTemplateId: dto.shiftTemplateId },
      );
    }

    await this.rosterLock.ensurePeriodEditable({
      branchId: template.branchId ?? null,
      from: dto.effectiveFrom,
      to: dto.effectiveTo ?? dto.effectiveFrom
    });

    // Validate target assignment using ShiftValidationService
    const validationResults = await this.validationService.validateAssignment(dto.employeeId, {
      date: dto.effectiveFrom,
      startTime: template.startTime,
      endTime: template.endTime,
      isNightShift: template.isNightShift
    });

    const failedRule = validationResults.find((r) => !r.success);
    if (failedRule) {
      throwConflict(
        failedRule.message || 'Shift validation rule conflict',
        ERROR_CODES.SCHEDULE_CONFLICT,
        { employeeId: dto.employeeId, rule: failedRule.ruleName }
      );
    }

    let locationName = '';
    if (dto.locationId) {
      const loc = await this.repo.findLocationById(dto.locationId);
      if (loc) {
        locationName = loc.name;
      }
    }

    const payload: ShiftAssignmentCreateValues = {
      ...(WorkforceShiftsMapper.toAssignmentEntity({
        ...dto,
        status: dto.status ?? 'planned'
      }) as ShiftAssignmentCreateValues),
      employeeId: dto.employeeId,
      assignmentDate: dto.effectiveFrom,
      snapshotShiftName: template.name,
      snapshotStartTime: template.startTime,
      snapshotEndTime: template.endTime,
      snapshotBreakMinutes: template.breakMinutes,
      snapshotLocationName: locationName
    };

    const created = await this.repo.createShiftAssignment(payload);
    const createdRow = assertAssignment(created, 'new');

    await this.eventOutbox.stage(
      new AssignmentCreatedEvent({
        assignmentId: createdRow.id,
        employeeId: createdRow.employeeId,
        shiftTemplateId: createdRow.shiftTemplateId ?? '',
        effectiveFrom: createdRow.effectiveFrom ?? createdRow.assignmentDate,
        effectiveTo: createdRow.effectiveTo,
      }),
    );

    const hydrated = await this.repo.findShiftAssignmentById(createdRow.id, scope);

    return WorkforceShiftsMapper.toAssignmentDto(
      assertAssignment(hydrated, createdRow.id)
    );
  }
}

@Injectable()
export class UpdateEmployeeShiftAssignmentUseCase {
  constructor(
    private readonly repo: WorkforceShiftsRepository,
    private readonly rosterLock: ShiftRosterLockService,
    private readonly validationService: ShiftValidationService
  ) {}

  async execute(
    id: string,
    dto: UpdateEmployeeShiftAssignmentDto,
    scope?: DataScope
  ) {
    const existingAssignment = await this.repo.findShiftAssignmentById(id, scope);
    if (!existingAssignment) {
      throwNotFound('Shift assignment not found', ERROR_CODES.SCHEDULE_NOT_FOUND, {
        shiftAssignmentId: id
      });
    }

    const employeeId = dto.employeeId ?? existingAssignment.employeeId;
    const effectiveFrom =
      dto.effectiveFrom ??
      existingAssignment.effectiveFrom ??
      existingAssignment.assignmentDate;
    const effectiveTo = dto.effectiveTo ?? existingAssignment.effectiveTo ?? undefined;

    await this.rosterLock.ensurePeriodEditable({
      branchId: existingAssignment.shiftTemplate?.branchId ?? null,
      departmentId: existingAssignment.employee?.departmentId ?? null,
      from: effectiveFrom,
      to: effectiveTo ?? effectiveFrom
    });

    const templateId = dto.shiftTemplateId ?? existingAssignment.shiftTemplateId;
    if (!templateId) {
      throwBadRequest('Shift template is required for assignment', ERROR_CODES.INVALID_REQUEST);
    }
    const template = await this.repo.findShiftTemplateById(templateId);
    if (!template) {
      throwNotFound('Shift template not found', ERROR_CODES.SHIFT_TEMPLATE_INACTIVE);
    }

    // Validate using ShiftValidationService
    const validationResults = await this.validationService.validateAssignment(employeeId, {
      id,
      date: effectiveFrom,
      startTime: template.startTime,
      endTime: template.endTime,
      isNightShift: template.isNightShift
    });

    const failedRule = validationResults.find((r) => !r.success);
    if (failedRule) {
      throwConflict(
        failedRule.message || 'Shift validation rule conflict',
        ERROR_CODES.SCHEDULE_CONFLICT,
        { employeeId, rule: failedRule.ruleName }
      );
    }

    const snapshotUpdate: Record<string, any> = {};
    if (dto.shiftTemplateId) {
      const temp = await this.repo.findShiftTemplateById(dto.shiftTemplateId);
      if (temp) {
        snapshotUpdate.snapshotShiftName = temp.name;
        snapshotUpdate.snapshotStartTime = temp.startTime;
        snapshotUpdate.snapshotEndTime = temp.endTime;
        snapshotUpdate.snapshotBreakMinutes = temp.breakMinutes;
      }
    }
    if (dto.locationId) {
      const loc = await this.repo.findLocationById(dto.locationId);
      snapshotUpdate.snapshotLocationName = loc?.name ?? '';
    }

    const updated = await this.repo.updateShiftAssignment(
      id,
      {
        ...WorkforceShiftsMapper.toAssignmentEntity(dto),
        ...snapshotUpdate
      },
      dto.version
    );

    if (!updated) {
      throwConflict(
        'Shift assignment was updated by another user or version mismatch',
        ERROR_CODES.SCHEDULE_CONFLICT,
        { shiftAssignmentId: id }
      );
    }

    const hydrated = await this.repo.findShiftAssignmentById(id, scope);
    return WorkforceShiftsMapper.toAssignmentDto(assertAssignment(hydrated, id));
  }
}

@Injectable()
export class CancelEmployeeShiftAssignmentUseCase {
  constructor(
    private readonly repo: WorkforceShiftsRepository,
    private readonly rosterLock: ShiftRosterLockService,
    private readonly eventOutbox: EventOutboxService,
  ) {}

  async execute(
    id: string,
    dto: CancelEmployeeShiftAssignmentDto,
    scope?: DataScope
  ) {
    const existing = await this.repo.findShiftAssignmentById(id, scope);
    if (!existing) {
      throwNotFound('Shift assignment not found', ERROR_CODES.SCHEDULE_NOT_FOUND, {
        shiftAssignmentId: id
      });
    }

    const cancelDate = new Date(`${dto.cancelFrom}T00:00:00.000Z`);
    const startDate = new Date(
      `${(existing.effectiveFrom ?? existing.assignmentDate)}T00:00:00.000Z`
    );

    if (cancelDate < startDate) {
      throwBadRequest(
        'Cancel date cannot be earlier than assignment effective start',
        ERROR_CODES.SHIFT_CANCEL_BEFORE_START,
        { shiftAssignmentId: id },
      );
    }

    await this.rosterLock.ensurePeriodEditable({
      branchId: existing.shiftTemplate?.branchId ?? null,
      departmentId: existing.employee?.departmentId ?? null,
      from: existing.effectiveFrom ?? existing.assignmentDate,
      to: dto.cancelFrom
    });

    const updated = await this.repo.updateShiftAssignment(
      id,
      {
        status: 'cancelled',
        effectiveTo: dto.cancelFrom,
        cancelledAt: new Date(),
        note: dto.reason ?? existing.note
      },
      dto.version
    );

    if (!updated) {
      throwConflict(
        'Shift assignment was updated by another user or version mismatch',
        ERROR_CODES.SCHEDULE_CONFLICT,
        { shiftAssignmentId: id }
      );
    }

    await this.eventOutbox.stage(
      new AssignmentCancelledEvent({
        assignmentId: id,
        employeeId: existing.employeeId,
        reason: dto.reason ?? null,
      }),
    );

    const hydrated = await this.repo.findShiftAssignmentById(id, scope);
    return WorkforceShiftsMapper.toAssignmentDto(assertAssignment(hydrated, id));
  }
}
