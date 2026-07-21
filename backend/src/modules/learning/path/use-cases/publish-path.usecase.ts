import { Injectable } from "@nestjs/common";
import { LearningPathRepository } from "../repositories/learning-path.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class PublishPathUseCase {
  constructor(private readonly repo: LearningPathRepository) {}
  async execute(id: string): Promise<void> {
    const path = await this.repo.findPathById(id);
    if (!path) throwNotFound("Path not found", ERROR_CODES.NOT_FOUND);
    if (path.status !== "draft") throwBadRequest("Only draft paths can be published", ERROR_CODES.INVALID_REQUEST);
    await this.repo.updatePath(id, { status: "published" });
  }
}