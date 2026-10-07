import { Injectable, Inject } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { employeeStatusHistory } from '../../../../infrastructure/database/schema';
import type { AppDatabase } from '../../../../infrastructure/database/database-client.type';
import type { TimelineEvent } from '../types/timeline-types';

@Injectable()
export class StatusEventProvider {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async getEvents(employeeId: string): Promise<TimelineEvent[]> {
    const rows = await this.db
      .select({
        id: employeeStatusHistory.id,
        status: employeeStatusHistory.status,
        notes: employeeStatusHistory.notes,
        changedAt: employeeStatusHistory.changedAt,
        changedBy: employeeStatusHistory.changedBy,
      })
      .from(employeeStatusHistory)
      .where(eq(employeeStatusHistory.employeeId, employeeId))
      .orderBy(desc(employeeStatusHistory.changedAt))
      .limit(100);

    return rows.map((row) => ({
      id: `status_${row.id}`,
      type: 'status' as const,
      event: 'status_changed' as const,
      occurredAt: row.changedAt,
      actorName: null, // ponytail: join users table when timeline UX requires actor display
      metadataVersion: 1 as const,
      metadata: {
        newStatus: row.status,
        reason: row.notes ?? null,
      },
    }));
  }
}
