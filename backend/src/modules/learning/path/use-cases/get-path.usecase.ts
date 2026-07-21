import { Injectable } from "@nestjs/common";
import { LearningPathRepository } from "../repositories/learning-path.repository";
import { PathResponseDto } from "../../dto/learning.dto";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class GetPathUseCase {
  constructor(private readonly repo: LearningPathRepository) {}
  async execute(id: string): Promise<PathResponseDto> {
    const r = await this.repo.findPathById(id);
    if (!r) throwNotFound("Path not found", ERROR_CODES.NOT_FOUND);
    return { id: r.id, name: r.name, status: r.status };
  }
}