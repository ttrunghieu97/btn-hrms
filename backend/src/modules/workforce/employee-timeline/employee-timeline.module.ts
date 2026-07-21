import { Module } from '@nestjs/common';
import { EmployeeTimelineController } from './employee-timeline.controller';
import { ListEmployeeTimelineUseCase } from './use-cases/list-employee-timeline.usecase';
import { TimelineAggregator } from './aggregators/timeline.aggregator';
import { SystemEventProvider } from './providers/system-event.provider';
import { StatusEventProvider } from './providers/status-event.provider';
import { ContractEventProvider } from './providers/contract-event.provider';
import { PositionEventProvider } from './providers/position-event.provider';

@Module({
  controllers: [EmployeeTimelineController],
  providers: [
    ListEmployeeTimelineUseCase,
    TimelineAggregator,
    SystemEventProvider,
    StatusEventProvider,
    ContractEventProvider,
    PositionEventProvider,
  ],
  exports: [
    ListEmployeeTimelineUseCase,
  ],
})
export class EmployeeTimelineModule {}
