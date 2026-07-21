import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { employees } from '../../../../infrastructure/database/schema';
import type { AppDatabase } from '../../../../infrastructure/database/database-client.type';
import type { TimelineEvent } from '../types/timeline-types';

@Injectable()
export class SystemEventProvider {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async getEvents(employeeId: string): Promise<TimelineEvent[]> {
    const [row] = await this.db
      .select({
        id: employees.id,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!row) return [];

    return [
      {
        id: `system_${row.id}_created`,
        type: 'system',
        event: 'employee_created',
        occurredAt: row.createdAt,
        actorName: null,
        metadataVersion: 1,
        metadata: {},
      },
    ];
  }
}
