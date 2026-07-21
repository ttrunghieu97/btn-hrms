import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineRepository } from "../repositories/platform-workflow-engine.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class GetWorkflowDefinitionUseCase {
  constructor(private readonly repo: PlatformWorkflowEngineRepository) {}

  async execute(key: string) {
    const def = await this.repo.findDefinitionByKey(key);
    if (!def) throwNotFound("Workflow definition not found", ERROR_CODES.WORKFLOW_ACTION_FAILED, { key });
    return def;
  }
}
