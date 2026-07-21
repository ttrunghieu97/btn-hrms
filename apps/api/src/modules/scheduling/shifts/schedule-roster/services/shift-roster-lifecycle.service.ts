import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from '../../../../../shared/constants/error-codes';
import { throwConflict } from '../../../../../shared/utils/http-error';
import { type RosterPublicationRecord, type ShiftRosterStatus } from '../repositories/workforce-shifts.repository.contract';

const ALLOWED_TRANSITIONS: Record<ShiftRosterStatus, ShiftRosterStatus[]> = {
  draft: ['pending_approval'],
  pending_approval: ['approved', 'rejected'],
  approved: ['published_locked'],
  rejected: ['pending_approval'],
  published_locked: []
};

@Injectable()
export class ShiftRosterLifecycleService {
  assertTransition(from: ShiftRosterStatus, to: ShiftRosterStatus) {
    if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
      throwConflict('Invalid roster status transition', ERROR_CODES.INVALID_STATUS_TRANSITION, {
        from,
        to
      });
    }
  }

  buildTransitionPayload(
    record: RosterPublicationRecord,
    to: ShiftRosterStatus,
    actorUserId?: string | null,
    reason?: string | null
  ) {
    this.assertTransition(record.status as ShiftRosterStatus, to);

    const now = new Date();
    const base = {
      status: to,
      version: (record.version ?? 1) + 1,
      updatedAt: now
    };

    if (to === 'pending_approval') {
      return {
        ...base,
        submittedAt: now,
        submittedByUserId: actorUserId ?? null,
        approvedAt: null,
        approvedByUserId: null,
        rejectedAt: null,
        rejectedByUserId: null,
        rejectionReason: null,
        publishedAt: null,
        publishedByUserId: null,
        lockedAt: null,
        lockedByUserId: null
      };
    }

    if (to === 'approved') {
      return {
        ...base,
        approvedAt: now,
        approvedByUserId: actorUserId ?? null,
        rejectedAt: null,
        rejectedByUserId: null,
        rejectionReason: null
      };
    }

    if (to === 'rejected') {
      return {
        ...base,
        rejectedAt: now,
        rejectedByUserId: actorUserId ?? null,
        rejectionReason: reason ?? null,
        approvedAt: null,
        approvedByUserId: null,
        publishedAt: null,
        publishedByUserId: null,
        lockedAt: null,
        lockedByUserId: null
      };
    }

    return {
      ...base,
      publishedAt: now,
      publishedByUserId: actorUserId ?? null,
      lockedAt: now,
      lockedByUserId: actorUserId ?? null
    };
  }
}

