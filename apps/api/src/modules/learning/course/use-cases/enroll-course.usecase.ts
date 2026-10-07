import { Injectable } from "@nestjs/common";
import { CourseRepository } from "../repositories/course.repository";
import { EnrollmentResponseDto } from "../../dto/learning.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class EnrollCourseUseCase {
  constructor(private readonly repo: CourseRepository) {}
  async execute(courseId: string, employeeId: string): Promise<EnrollmentResponseDto> {
    const course = await this.repo.findCourseById(courseId);
    if (!course) throwNotFound("Course not found", ERROR_CODES.NOT_FOUND);
    if (course.status !== "published") throwBadRequest("Course must be published", ERROR_CODES.INVALID_REQUEST);
    const r = await this.repo.insertEnrollment({ courseId, employeeId, status: "enrolled" });
    return { id: r.id, courseId: r.courseId, employeeId: r.employeeId, status: r.status, progressPercent: r.progressPercent };
  }
}