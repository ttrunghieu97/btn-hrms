import { Injectable } from "@nestjs/common";
import { LearningPathRepository } from "../repositories/learning-path.repository";
import { CreatePathDto, PathResponseDto } from "../../dto/learning.dto";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class CreatePathUseCase {
  constructor(private readonly repo: LearningPathRepository) {}
  async execute(dto: CreatePathDto): Promise<PathResponseDto> {
    if (!dto.name?.trim()) throwBadRequest("Name is required", ERROR_CODES.INVALID_REQUEST);
    const path = await this.repo.insertPath({ name: dto.name, description: dto.description ?? null, status: "draft" });
    if (dto.courses) {
      for (let i = 0; i < dto.courses.length; i++) {
        const courseId = dto.courses[i];
        if (courseId) await this.repo.addPathCourse({ pathId: path.id, courseId, orderIndex: i });
      }
    }
    return { id: path.id, name: path.name, status: path.status };
  }
}