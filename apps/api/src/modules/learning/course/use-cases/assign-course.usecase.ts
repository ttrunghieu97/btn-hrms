import { Injectable } from "@nestjs/common";
import { CourseRepository } from "../repositories/course.repository";
import { AssignCourseDto } from "../../dto/learning.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { CourseAssignedEvent } from "../../../../core/events/events/course-assigned.event";
@Injectable()
export class AssignCourseUseCase {
  constructor(private readonly repo: CourseRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(dto: AssignCourseDto, assignedByUserId: string): Promise<void> {
    const course = await this.repo.findCourseById(dto.courseId);
    if (!course) throwNotFound("Course not found", ERROR_CODES.NOT_FOUND);
    if (course.status !== "published") throwBadRequest("Only published courses can be assigned", ERROR_CODES.INVALID_REQUEST);
    for (const empId of dto.employeeIds) {
      const assignment = await this.repo.insertAssignment({ courseId: dto.courseId, employeeId: empId, dueDate: dto.dueDate ?? null, assignedByUserId });
      await this.eventOutbox.stage(new CourseAssignedEvent({ assignmentId: assignment.id, courseId: dto.courseId, employeeId: empId, assignedByUserId }));
      await this.repo.insertEnrollment({ courseId: dto.courseId, employeeId: empId, status: "enrolled" });
    }
  }
}