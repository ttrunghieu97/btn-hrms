import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from '../../../../../shared/constants/error-codes';
import { throwBadRequest, throwNotFound } from '../../../../../shared/utils/http-error';
import { CreateWorkforceShiftTemplateDto } from '../../dto/create-workforce-shift-template.dto';
import { WorkforceShiftTemplateQueryDto } from '../../dto/workforce-shift-template-query.dto';
import { UpdateWorkforceShiftTemplateDto } from '../../dto/update-workforce-shift-template.dto';
import { WorkforceShiftsMapper } from '../../mappers/workforce-shifts.mapper';
import {
  type ShiftTemplateCreateValues
} from '../../schedule-roster/repositories/workforce-shifts.repository.contract';
import { WorkforceShiftsRepository } from '../../schedule-roster/repositories/workforce-shifts.repository';
import { validateShiftTemplateTimes } from "../services/shift-time.validator";

@Injectable()
export class ListWorkforceShiftTemplatesUseCase {
  constructor(private readonly repo: WorkforceShiftsRepository) {}

  async execute(query: WorkforceShiftTemplateQueryDto) {
    const result = await this.repo.listShiftTemplates(query);
    return {
      ...result,
      rows: result.rows.map(WorkforceShiftsMapper.toTemplateDto)
    };
  }
}

@Injectable()
export class CreateWorkforceShiftTemplateUseCase {
  constructor(private readonly repo: WorkforceShiftsRepository) {}

  async execute(dto: CreateWorkforceShiftTemplateDto) {
    validateShiftTemplateTimes({
      startTime: dto.startTime,
      endTime: dto.endTime,
      overnight: dto.overnight
    });

    const payload: ShiftTemplateCreateValues = {
      code: dto.code,
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      breakMinutes: dto.breakMinutes ?? 0,
      isActive: true,
      ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
      ...(dto.locationId !== undefined
        ? { locationId: dto.locationId }
        : {}),
      ...(dto.activeWeekdays !== undefined ? { workDays: dto.activeWeekdays } : {}),
      ...(dto.overnight !== undefined ? { isNightShift: dto.overnight } : {})
    };

    const row = await this.repo.createShiftTemplate(payload);

    if (!row) {
      throwBadRequest('Failed to create shift template', ERROR_CODES.SHIFT_TEMPLATE_CREATE_FAILED);
    }

    return WorkforceShiftsMapper.toTemplateDto(row);
  }
}

@Injectable()
export class UpdateWorkforceShiftTemplateUseCase {
  constructor(private readonly repo: WorkforceShiftsRepository) {}

  async execute(id: string, dto: UpdateWorkforceShiftTemplateDto) {
    const existing = await this.repo.findShiftTemplateById(id);
    if (!existing) {
      throwNotFound('Shift template not found', ERROR_CODES.SCHEDULE_NOT_FOUND, {
        shiftTemplateId: id
      });
    }

    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    const overnight = dto.overnight ?? existing.isNightShift;
    validateShiftTemplateTimes({ startTime, endTime, overnight });

    const updated = await this.repo.updateShiftTemplate(
      id,
      WorkforceShiftsMapper.toTemplateEntity(dto)
    );

    if (!updated) {
      throwNotFound('Shift template not found', ERROR_CODES.SCHEDULE_NOT_FOUND, {
        shiftTemplateId: id
      });
    }

    return WorkforceShiftsMapper.toTemplateDto(updated);
  }
}

@Injectable()
export class ArchiveWorkforceShiftTemplateUseCase {
  constructor(private readonly repo: WorkforceShiftsRepository) {}

  async execute(id: string) {
    const existing = await this.repo.findShiftTemplateById(id);
    if (!existing) {
      throwNotFound('Shift template not found', ERROR_CODES.SCHEDULE_NOT_FOUND, {
        shiftTemplateId: id
      });
    }

    if (!existing.isActive) {
      throwBadRequest('Shift template is already archived', ERROR_CODES.SHIFT_TEMPLATE_ALREADY_ARCHIVED, { shiftTemplateId: id });
    }

    const updated = await this.repo.updateShiftTemplate(id, {
      isActive: false
    });

    if (!updated) {
      throwNotFound('Shift template not found', ERROR_CODES.SCHEDULE_NOT_FOUND, {
        shiftTemplateId: id
      });
    }

    return WorkforceShiftsMapper.toTemplateDto(updated);
  }
}

