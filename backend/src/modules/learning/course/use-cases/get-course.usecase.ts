import { Injectable } from "@nestjs/common";
import { CourseRepository } from "../repositories/course.repository";
import { CourseResponseDto } from "../../dto/learning.dto";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class GetCourseUseCase {
  constructor(private readonly repo: CourseRepository) {}
  async execute(id: string): Promise<CourseResponseDto> {
    const r = await this.repo.findCourseById(id);
    if (!r) throwNotFound("Course not found", ERROR_CODES.NOT_FOUND);
    return { id: r.id, title: r.title, status: r.status, estimatedHours: r.estimatedHours };
  }
}