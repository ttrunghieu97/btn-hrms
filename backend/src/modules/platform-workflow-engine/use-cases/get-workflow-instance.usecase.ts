import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineRepository } from "../repositories/platform-workflow-engine.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class GetWorkflowInstanceUseCase {
  constructor(private readonly repo: PlatformWorkflowEngineRepository) {}

  async execute(id: string) {
    const instance = await this.repo.getInstance(id);
    if (!instance) throwNotFound("Workflow instance not found", ERROR_CODES.WORKFLOW_ACTION_FAILED, { id });

    const transitions = await this.repo.listTransitionsByInstanceId(id);
    return { ...instance, transitions };
  }
}
