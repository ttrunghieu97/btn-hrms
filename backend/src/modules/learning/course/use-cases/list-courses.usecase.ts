import { Injectable } from "@nestjs/common";
import { CourseRepository } from "../repositories/course.repository";
import { CourseResponseDto } from "../../dto/learning.dto";
@Injectable()
export class ListCoursesUseCase {
  constructor(private readonly repo: CourseRepository) {}
  async execute(): Promise<CourseResponseDto[]> {
    const rows = await this.repo.findCourses();
    return rows.map((r) => ({ id: r.id, title: r.title, status: r.status, estimatedHours: r.estimatedHours }));
  }
}