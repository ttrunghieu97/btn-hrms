import { Injectable } from "@nestjs/common";
import { CourseRepository } from "../repositories/course.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class PublishCourseUseCase {
  constructor(private readonly repo: CourseRepository) {}
  async execute(id: string): Promise<void> {
    const course = await this.repo.findCourseById(id);
    if (!course) throwNotFound("Course not found", ERROR_CODES.NOT_FOUND);
    if (course.status !== "draft") throwBadRequest("Only draft courses can be published", ERROR_CODES.INVALID_REQUEST);
    await this.repo.updateCourse(id, { status: "published" });
  }
}