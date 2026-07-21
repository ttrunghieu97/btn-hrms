import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineService } from "../platform-approval-engine.service";
import { CreateApprovalPolicyDto } from "../dto/create-approval-policy.dto";

@Injectable()
export class CreateApprovalPolicyUseCase {
  constructor(private readonly service: PlatformApprovalEngineService) {}

  async execute(dto: CreateApprovalPolicyDto) {
    return this.service.createPolicy({
      key: dto.key,
      version: dto.version ?? 1,
      name: dto.name ?? null,
      description: dto.description ?? null,
      steps: dto.steps,
    });
  }
}
