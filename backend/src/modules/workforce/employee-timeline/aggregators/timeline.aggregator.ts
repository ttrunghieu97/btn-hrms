import { Injectable } from '@nestjs/common';
import type { TimelineEvent, TimelineType } from '../types/timeline-types';
import { SystemEventProvider } from '../providers/system-event.provider';
import { StatusEventProvider } from '../providers/status-event.provider';
import { ContractEventProvider } from '../providers/contract-event.provider';
import { PositionEventProvider } from '../providers/position-event.provider';

interface AggregatorOptions {
  employeeId: string;
  types?: TimelineType[];
  limit?: number;
}

@Injectable()
export class TimelineAggregator {
  constructor(
    private readonly systemEventProvider: SystemEventProvider,
    private readonly statusEventProvider: StatusEventProvider,
    private readonly contractEventProvider: ContractEventProvider,
    private readonly positionEventProvider: PositionEventProvider,
  ) {}

  async execute(options: AggregatorOptions): Promise<TimelineEvent[]> {
    const { employeeId, types, limit = 20 } = options;

    const promises: Promise<TimelineEvent[]>[] = [];

    if (!types || types.includes('system')) {
      promises.push(this.systemEventProvider.getEvents(employeeId));
    }
    if (!types || types.includes('status')) {
      promises.push(this.statusEventProvider.getEvents(employeeId));
    }
    if (!types || types.includes('contract')) {
      promises.push(this.contractEventProvider.getEvents(employeeId));
    }
    if (!types || types.includes('position')) {
      promises.push(this.positionEventProvider.getEvents(employeeId));
    }

    const results = await Promise.all(promises);
    const all = results.flat();

    // Sort: occurredAt DESC, tie-breaker: type ASC, id ASC
    const typeOrder: Record<string, number> = {
      system: 0,
      status: 1,
      contract: 2,
      position: 3,
    };

    all.sort((a, b) => {
      const dateDiff = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (dateDiff !== 0) return dateDiff;

      const typeDiff = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      if (typeDiff !== 0) return typeDiff;

      return a.id.localeCompare(b.id);
    });

    return all.slice(0, limit);
  }
}
