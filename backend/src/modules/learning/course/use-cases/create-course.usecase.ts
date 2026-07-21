import { Injectable } from "@nestjs/common";
import { CourseRepository } from "../repositories/course.repository";
import { CreateCourseDto, CourseResponseDto } from "../../dto/learning.dto";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class CreateCourseUseCase {
  constructor(private readonly repo: CourseRepository) {}
  async execute(dto: CreateCourseDto): Promise<CourseResponseDto> {
    if (!dto.title?.trim()) throwBadRequest("Title is required", ERROR_CODES.INVALID_REQUEST);
    const r = await this.repo.insertCourse({ title: dto.title, description: dto.description ?? null, status: "draft", estimatedHours: dto.estimatedHours ?? null });
    return { id: r.id, title: r.title, status: r.status, estimatedHours: r.estimatedHours };
  }
}