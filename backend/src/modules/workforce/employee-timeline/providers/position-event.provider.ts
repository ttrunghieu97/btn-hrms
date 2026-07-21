import { Injectable, Inject } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import {
  jobAssignments,
  positions,
} from '../../../../infrastructure/database/schema';
import type { AppDatabase } from '../../../../infrastructure/database/database-client.type';
import type { TimelineEvent } from '../types/timeline-types';

@Injectable()
export class PositionEventProvider {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async getEvents(employeeId: string): Promise<TimelineEvent[]> {
    const rows = await this.db
      .select({
        id: jobAssignments.id,
        startDate: jobAssignments.startDate,
        endDate: jobAssignments.endDate,
        isPrimary: jobAssignments.isPrimary,
        createdAt: jobAssignments.createdAt,
        positionName: positions.name,
      })
      .from(jobAssignments)
      .leftJoin(positions, eq(jobAssignments.positionId, positions.id))
      .where(eq(jobAssignments.employeeId, employeeId))
      .orderBy(desc(jobAssignments.createdAt));

    return rows.map((row) => ({
      id: `position_${row.id}`,
      type: 'position' as const,
      event: 'assignment_created' as const,
      occurredAt: row.createdAt,
      actorName: null,
      metadataVersion: 1 as const,
      metadata: {
        positionName: row.positionName ?? null,
        isPrimary: row.isPrimary,
      },
    }));
  }
}
