import { Injectable } from "@nestjs/common";
import { CourseRepository } from "../repositories/course.repository";
import { EnrollmentResponseDto } from "../../dto/learning.dto";
@Injectable()
export class ListEnrollmentsUseCase {
  constructor(private readonly repo: CourseRepository) {}
  async execute(employeeId: string): Promise<EnrollmentResponseDto[]> {
    const rows = await this.repo.findEnrollmentsByEmployee(employeeId);
    return rows.map((r) => ({ id: r.id, courseId: r.courseId, employeeId: r.employeeId, status: r.status, progressPercent: r.progressPercent }));
  }
}