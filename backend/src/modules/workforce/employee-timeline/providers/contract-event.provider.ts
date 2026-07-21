import { Injectable, Inject } from '@nestjs/common';
import { desc, eq, and, or, isNull, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import { employeeContracts } from '../../../../infrastructure/database/schema';
import type { AppDatabase } from '../../../../infrastructure/database/database-client.type';
import type { TimelineEvent, TimelineContractEvent } from '../types/timeline-types';

@Injectable()
export class ContractEventProvider {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async getEvents(employeeId: string): Promise<TimelineEvent[]> {
    const rows = await this.db
      .select()
      .from(employeeContracts)
      .where(eq(employeeContracts.employeeId, employeeId))
      .orderBy(desc(employeeContracts.createdAt));

    const events: TimelineEvent[] = [];

    for (const contract of rows) {
      // Contract created
      if (contract.version === 1) {
        events.push(this.buildEvent(contract, 'contract_created'));
      } else {
        // Higher version = renewed
        events.push(this.buildEvent(contract, 'contract_renewed'));
      }

      // Contract ended/expired
      if (contract.status === 'terminated' && contract.effectiveTo) {
        const now = new Date();
        const effectiveTo = new Date(contract.effectiveTo);
        if (effectiveTo < now) {
          events.push(this.buildEvent(contract, 'contract_expired'));
        } else {
          events.push(this.buildEvent(contract, 'contract_ended'));
        }
      }
    }

    return events;
  }

  private buildEvent(
    contract: typeof employeeContracts.$inferSelect,
    event: TimelineContractEvent,
  ): TimelineEvent {
    return {
      id: `contract_${contract.id}_${event}`,
      type: 'contract',
      event,
      occurredAt: contract.createdAt,
      actorName: null,
      metadataVersion: 1,
      metadata: {
        contractType: contract.contractType,
        version: contract.version,
        ...(contract.previousContractId
          ? { previousVersion: this.extractVersion(contract.previousContractId) }
          : {}),
      },
    };
  }

  private extractVersion(_previousContractId: string): number {
    // ponytail: query previous contract's version number when multi-version contract UI is built
    return 1;
  }
}
