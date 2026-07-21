import { Injectable } from "@nestjs/common";
import { LearningPathRepository } from "../repositories/learning-path.repository";
import { PathResponseDto } from "../../dto/learning.dto";
@Injectable()
export class ListPathsUseCase {
  constructor(private readonly repo: LearningPathRepository) {}
  async execute(): Promise<PathResponseDto[]> {
    const rows = await this.repo.findPaths();
    return rows.map((r) => ({ id: r.id, name: r.name, status: r.status }));
  }
}