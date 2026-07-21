import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from '../../../../../shared/constants/error-codes';
import { throwConflict } from '../../../../../shared/utils/http-error';
import { type RosterPeriodScope } from '../repositories/workforce-shifts.repository.contract';
import { WorkforceShiftsRepository } from '../repositories/workforce-shifts.repository';

@Injectable()
export class ShiftRosterLockService {
  constructor(private readonly repo: WorkforceShiftsRepository) {}

  async ensurePeriodEditable(scope: RosterPeriodScope) {
    const publication = await this.repo.findBlockingRosterPublication(scope);
    if (!publication) {
      return;
    }

    throwConflict('Roster period is locked for changes', ERROR_CODES.SCHEDULE_LOCKED, {
      branchId: publication.branchId,
      departmentId: publication.departmentId,
      from: publication.periodStart,
      to: publication.periodEnd,
      status: publication.status
    });
  }
}

