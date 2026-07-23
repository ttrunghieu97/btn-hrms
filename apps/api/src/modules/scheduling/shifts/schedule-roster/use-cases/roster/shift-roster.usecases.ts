import { Injectable } from '@nestjs/common';
import { type DataScope } from '../../../../../../core/security/types/data-scope.interface';
import { ApproveShiftRosterDto } from '../../../dto/approve-shift-roster.dto';
import { PublishShiftRosterDto } from '../../../dto/publish-shift-roster.dto';
import { RejectShiftRosterDto } from '../../../dto/reject-shift-roster.dto';
import { ShiftRosterQueryDto } from '../../../dto/shift-roster-query.dto';
import { SubmitShiftRosterDto } from '../../../dto/submit-shift-roster.dto';
import { type RosterPublicationRecord, type ShiftRosterStatus } from '../../repositories/workforce-shifts.repository.contract';
import { WorkforceShiftsRepository } from '../../repositories/workforce-shifts.repository';
import { RosterExpansionService } from '../../services/roster-expansion.service';
import { ShiftRosterLifecycleService } from '../../services/shift-roster-lifecycle.service';
import { EventOutboxService } from '../../../../../../core/events/event-outbox.service';
import { throwConflict } from '../../../../../../shared/utils/http-error';
import { RosterSubmittedEvent } from '../../../../../../core/events/events/roster-submitted.event';
import { RosterApprovedEvent } from '../../../../../../core/events/events/roster-approved.event';
import { RosterRejectedEvent } from '../../../../../../core/events/events/roster-rejected.event';
import { RosterPublishedEvent } from '../../../../../../core/events/events/roster-published.event';

function toPublicationDto(publication: RosterPublicationRecord | null) {
  if (!publication) {
    return {
      isPublished: false,
      status: 'draft',
      submittedAt: null,
      submittedByUserId: null,
      approvedAt: null,
      approvedByUserId: null,
      rejectedAt: null,
      rejectedByUserId: null,
      rejectionReason: null,
      publishedAt: null,
      publishedByUserId: null,
      lockedAt: null,
      lockedByUserId: null,
      version: 1
    };
  }

  return {
    isPublished: publication.status === 'published_locked',
    status: publication.status,
    submittedAt: publication.submittedAt,
    submittedByUserId: publication.submittedByUserId,
    approvedAt: publication.approvedAt,
    approvedByUserId: publication.approvedByUserId,
    rejectedAt: publication.rejectedAt,
    rejectedByUserId: publication.rejectedByUserId,
    rejectionReason: publication.rejectionReason,
    publishedAt: publication.publishedAt,
    publishedByUserId: publication.publishedByUserId,
    lockedAt: publication.lockedAt,
    lockedByUserId: publication.lockedByUserId,
    version: publication.version
  };
}

@Injectable()
export class QueryShiftRosterUseCase {
  constructor(
    private readonly repo: WorkforceShiftsRepository,
    private readonly expansionService: RosterExpansionService
  ) {}

  async execute(query: ShiftRosterQueryDto, scope?: DataScope) {
    const rows = await this.repo.listRosterRows(query, scope);
    const publication = await this.repo.findRosterPublication(query);

    return {
      branchId: query.branchId ?? null,
      departmentId: query.departmentId ?? null,
      from: query.from,
      to: query.to,
      publication: toPublicationDto(publication),
      rows: this.expansionService.expand(rows, query.from, query.to)
    };
  }
}

abstract class BaseShiftRosterWorkflowUseCase {
  constructor(
    protected readonly repo: WorkforceShiftsRepository,
    protected readonly lifecycle: ShiftRosterLifecycleService,
    protected readonly eventOutbox: EventOutboxService,
  ) {}

  protected abstract buildRosterEvent(
    updated: { branchId: string | null; departmentId: string | null; periodStart: string; periodEnd: string },
    actorUserId: string,
  ): { eventType: string; data: Record<string, unknown> };

  protected async transitionRoster(
    scope: { branchId?: string | null; departmentId?: string | null; from: string; to: string },
    targetStatus: ShiftRosterStatus,
    actorUserId?: string | null,
    reason?: string | null,
    expectedVersion?: number
  ) {
    return this.repo.transaction(async (tx) => {
      const publication = await this.repo.ensureRosterPublication(scope, tx);

      if (expectedVersion !== undefined && publication.version !== expectedVersion) {
        throwConflict(
          'Roster publication version mismatch. Roster was modified by another user.',
          'SCHEDULE_CONFLICT',
          { rosterPublicationId: publication.id }
        );
      }

      const update = this.lifecycle.buildTransitionPayload(
        publication,
        targetStatus,
        actorUserId,
        reason
      );

      const updated = await this.repo.upsertRosterPublication({
        branchId: publication.branchId,
        departmentId: publication.departmentId,
        periodStart: publication.periodStart,
        periodEnd: publication.periodEnd,
        ...update
      }, tx);

      if (updated) {
        await this.repo.createRosterLifecycleHistory({
          rosterPublicationId: updated.id,
          action: targetStatus,
          fromStatus: publication.status,
          toStatus: targetStatus,
          actorUserId: actorUserId ?? null,
          reason: reason ?? null
        }, tx);

        // Fetch all assignments for the range and save version snapshot
        const assignments = await this.repo.listRosterRows({
          branchId: updated.branchId ?? undefined,
          departmentId: updated.departmentId ?? undefined,
          from: updated.periodStart,
          to: updated.periodEnd
        }, undefined);

        const snapshotData = assignments.map(a => ({
          id: a.id,
          employeeId: a.employeeId,
          assignmentDate: a.assignmentDate,
          effectiveFrom: a.effectiveFrom,
          effectiveTo: a.effectiveTo,
          status: a.status,
          note: a.note,
          shiftTemplateId: a.shiftTemplateId,
          locationId: a.locationId,
          snapshotShiftName: a.snapshotShiftName,
          snapshotStartTime: a.snapshotStartTime,
          snapshotEndTime: a.snapshotEndTime,
          snapshotBreakMinutes: a.snapshotBreakMinutes,
          snapshotLocationName: a.snapshotLocationName,
          employeeCode: a.employee?.employeeCode ?? '',
          employeeFirstName: a.employee?.firstName ?? '',
          employeeLastName: a.employee?.lastName ?? ''
        }));

        await this.repo.createRosterVersionSnapshot({
          rosterPublicationId: updated.id,
          version: updated.version,
          snapshotData: snapshotData,
          createdByUserId: actorUserId ?? null
        }, tx);
      }

      if (updated && actorUserId) {
        const event = this.buildRosterEvent({
          branchId: updated.branchId,
          departmentId: updated.departmentId,
          periodStart: updated.periodStart,
          periodEnd: updated.periodEnd,
        }, actorUserId);
        await this.eventOutbox.stage(event, tx);
      }

      return updated
        ? {
            id: updated.id,
            branchId: updated.branchId,
            departmentId: updated.departmentId,
            from: updated.periodStart,
            to: updated.periodEnd,
            publication: toPublicationDto(updated)
          }
        : null;
    });
  }
}

@Injectable()
export class SubmitShiftRosterForApprovalUseCase extends BaseShiftRosterWorkflowUseCase {
  constructor(
    repo: WorkforceShiftsRepository,
    lifecycle: ShiftRosterLifecycleService,
    eventOutbox: EventOutboxService,
  ) {
    super(repo, lifecycle, eventOutbox);
  }

  protected buildRosterEvent(
    updated: { branchId: string | null; departmentId: string | null; periodStart: string; periodEnd: string },
    actorUserId: string,
  ) {
    return new RosterSubmittedEvent({
      ...updated,
      submittedByUserId: actorUserId,
    });
  }

  async execute(dto: SubmitShiftRosterDto) {
    return this.transitionRoster(
      dto,
      'pending_approval',
      dto.submittedByUserId ?? null,
      null,
      dto.version
    );
  }
}

@Injectable()
export class ApproveShiftRosterUseCase extends BaseShiftRosterWorkflowUseCase {
  constructor(
    repo: WorkforceShiftsRepository,
    lifecycle: ShiftRosterLifecycleService,
    eventOutbox: EventOutboxService,
  ) {
    super(repo, lifecycle, eventOutbox);
  }

  protected buildRosterEvent(
    updated: { branchId: string | null; departmentId: string | null; periodStart: string; periodEnd: string },
    actorUserId: string,
  ) {
    return new RosterApprovedEvent({
      ...updated,
      approvedByUserId: actorUserId,
    });
  }

  async execute(dto: ApproveShiftRosterDto) {
    return this.transitionRoster(dto, 'approved', dto.approvedByUserId ?? null, null, dto.version);
  }
}

@Injectable()
export class RejectShiftRosterUseCase extends BaseShiftRosterWorkflowUseCase {
  constructor(
    repo: WorkforceShiftsRepository,
    lifecycle: ShiftRosterLifecycleService,
    eventOutbox: EventOutboxService,
  ) {
    super(repo, lifecycle, eventOutbox);
  }

  protected buildRosterEvent(
    updated: { branchId: string | null; departmentId: string | null; periodStart: string; periodEnd: string },
    actorUserId: string,
  ) {
    return new RosterRejectedEvent({
      ...updated,
      rejectedByUserId: actorUserId,
      reason: '',
    });
  }

  async execute(dto: RejectShiftRosterDto) {
    return this.transitionRoster(
      dto,
      'rejected',
      dto.rejectedByUserId ?? null,
      dto.reason,
      dto.version
    );
  }
}

@Injectable()
export class PublishShiftRosterUseCase extends BaseShiftRosterWorkflowUseCase {
  constructor(
    repo: WorkforceShiftsRepository,
    lifecycle: ShiftRosterLifecycleService,
    eventOutbox: EventOutboxService,
  ) {
    super(repo, lifecycle, eventOutbox);
  }

  protected buildRosterEvent(
    updated: { branchId: string | null; departmentId: string | null; periodStart: string; periodEnd: string },
    actorUserId: string,
  ) {
    return new RosterPublishedEvent({
      ...updated,
      publishedByUserId: actorUserId,
    });
  }

  async execute(dto: PublishShiftRosterDto) {
    return this.transitionRoster(
      dto,
      'published_locked',
      dto.publishedByUserId ?? null,
      null,
      dto.version
    );
  }
}

