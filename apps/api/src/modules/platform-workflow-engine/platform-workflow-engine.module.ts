import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { PlatformWorkflowEngineService } from "./platform-workflow-engine.service";
import { PlatformWorkflowEngineRepository } from "./repositories/platform-workflow-engine.repository";
import { DomainEventsWorkflowHandler } from "./handlers/domain-events-workflow.handler";

import { WorkflowDefinitionController } from "./controllers/workflow-definition.controller";
import { WorkflowInstanceController } from "./controllers/workflow-instance.controller";
import { WorkflowTasksController } from "./controllers/workflow-tasks.controller";

import { ListWorkflowDefinitionsUseCase } from "./use-cases/list-workflow-definitions.usecase";
import { GetWorkflowDefinitionUseCase } from "./use-cases/get-workflow-definition.usecase";
import { StartWorkflowInstanceUseCase } from "./use-cases/start-workflow-instance.usecase";
import { TransitionWorkflowInstanceUseCase } from "./use-cases/transition-workflow-instance.usecase";
import { CancelWorkflowInstanceUseCase } from "./use-cases/cancel-workflow-instance.usecase";
import { GetWorkflowInstanceUseCase } from "./use-cases/get-workflow-instance.usecase";
import { ListWorkflowInstancesUseCase } from "./use-cases/list-workflow-instances.usecase";
import { GetMyWorkflowTasksUseCase } from "./use-cases/get-my-workflow-tasks.usecase";

import { WorkflowTaskAggregatorRepository } from "./repositories/workflow-task-aggregator.repository";
import { WorkflowTaskAggregatorService } from "./tasks/workflow-task-aggregator.service";
import { LeaveTaskProvider } from "./tasks/providers/leave-task.provider";
import { ExpenseTaskProvider } from "./tasks/providers/expense-task.provider";
import { AssetTaskProvider } from "./tasks/providers/asset-task.provider";
import { ScheduleTaskProvider } from "./tasks/providers/schedule-task.provider";
import { PayrollTaskProvider } from "./tasks/providers/payroll-task.provider";
import { AttendanceTaskProvider } from "./tasks/providers/attendance-task.provider";
import { OffboardingTaskProvider } from "./tasks/providers/offboarding-task.provider";

@Module({
  imports: [DatabaseModule],
  controllers: [
    WorkflowDefinitionController,
    WorkflowInstanceController,
    WorkflowTasksController,
  ],
  providers: [
    PlatformWorkflowEngineRepository,
    PlatformWorkflowEngineService,
    DomainEventsWorkflowHandler,
    ListWorkflowDefinitionsUseCase,
    GetWorkflowDefinitionUseCase,
    StartWorkflowInstanceUseCase,
    TransitionWorkflowInstanceUseCase,
    CancelWorkflowInstanceUseCase,
    GetWorkflowInstanceUseCase,
    ListWorkflowInstancesUseCase,
    GetMyWorkflowTasksUseCase,
    WorkflowTaskAggregatorRepository,
    WorkflowTaskAggregatorService,
    LeaveTaskProvider,
    ExpenseTaskProvider,
    AssetTaskProvider,
    ScheduleTaskProvider,
    PayrollTaskProvider,
    AttendanceTaskProvider,
    OffboardingTaskProvider,
  ],
  exports: [PlatformWorkflowEngineService, WorkflowTaskAggregatorService],
})
export class PlatformWorkflowEngineDomainModule {}

