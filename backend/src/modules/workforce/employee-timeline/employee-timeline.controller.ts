import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CheckPolicy } from '../../../core/security/decorators/check-policy.decorator';
import { EmployeePolicies } from '../../../core/security/policies/employee.policy';
import { Resource } from '../../../core/security/decorators/resource.decorator';
import { Employee } from '../../../core/security/types/resource-entities';
import { ListEmployeeTimelineUseCase } from './use-cases/list-employee-timeline.usecase';
import { TimelineQueryDto } from './dto/timeline-event.dto';
import type { TimelineEventDto } from './dto/timeline-event.dto';

@ApiTags('Employee Timeline')
@ApiBearerAuth()
@Controller('employees/:employeeId/timeline')
export class EmployeeTimelineController {
  constructor(
    private readonly listTimeline: ListEmployeeTimelineUseCase,
  ) {}

  @Get()
  @Resource(Employee, 'employeeId')
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: 'Get employee activity timeline' })
  findAll(
    @Param('employeeId') employeeId: string,
    @Query() query: TimelineQueryDto,
  ): Promise<TimelineEventDto[]> {
    return this.listTimeline.execute({
      employeeId,
      types: query.types,
      limit: query.limit,
    });
  }
}
