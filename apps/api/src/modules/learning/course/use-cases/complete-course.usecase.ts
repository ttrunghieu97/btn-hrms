import { Injectable } from "@nestjs/common";
import { CourseRepository } from "../repositories/course.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { CourseCompletedEvent } from "../../../../core/events/events/course-completed.event";
@Injectable()
export class CompleteCourseUseCase {
  constructor(private readonly repo: CourseRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(enrollmentId: string): Promise<void> {
    const enrollment = await this.repo.findEnrollmentById(enrollmentId);
    if (!enrollment) throwNotFound("Enrollment not found", ERROR_CODES.NOT_FOUND);
    if (enrollment.status === "completed") throwBadRequest("Already completed", ERROR_CODES.INVALID_REQUEST);
    const now = new Date();
    await this.repo.updateEnrollment(enrollmentId, { status: "completed", progressPercent: 100, completedAt: now });
    await this.eventOutbox.stage(new CourseCompletedEvent({ enrollmentId, courseId: enrollment.courseId, employeeId: enrollment.employeeId, completedAt: now.toISOString() }));
  }
}