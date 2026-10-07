import { Injectable } from "@nestjs/common";
import { BenefitPlanRepository } from "../repositories/benefit-plan.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class PublishPlanUseCase {
  constructor(private readonly repo: BenefitPlanRepository) {}
  async execute(id: string): Promise<void> {
    const plan = await this.repo.findById(id);
    if (!plan) throwNotFound("Plan not found", ERROR_CODES.NOT_FOUND);
    if (plan.status !== "draft") throwBadRequest("Only draft plans can be published", ERROR_CODES.INVALID_REQUEST);
    await this.repo.update(id, { status: "published" });
  }
}
