import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { PlatformWorkflowEngineService } from "./platform-workflow-engine.service";
import { PlatformWorkflowEngineRepository } from "./repositories/platform-workflow-engine.repository";
import { DomainEventsWorkflowHandler } from "./handlers/domain-events-workflow.handler";

import { WorkflowDefinitionController } from "./controllers/workflow-definition.controller";
import { WorkflowInstanceController } from "./controllers/workflow-instance.controller";

import { ListWorkflowDefinitionsUseCase } from "./use-cases/list-workflow-definitions.usecase";
import { GetWorkflowDefinitionUseCase } from "./use-cases/get-workflow-definition.usecase";
import { StartWorkflowInstanceUseCase } from "./use-cases/start-workflow-instance.usecase";
import { TransitionWorkflowInstanceUseCase } from "./use-cases/transition-workflow-instance.usecase";
import { CancelWorkflowInstanceUseCase } from "./use-cases/cancel-workflow-instance.usecase";
import { GetWorkflowInstanceUseCase } from "./use-cases/get-workflow-instance.usecase";
import { ListWorkflowInstancesUseCase } from "./use-cases/list-workflow-instances.usecase";

@Module({
  imports: [DatabaseModule],
  controllers: [WorkflowDefinitionController, WorkflowInstanceController],
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
  ],
  exports: [PlatformWorkflowEngineService],
})
export class PlatformWorkflowEngineDomainModule {}
