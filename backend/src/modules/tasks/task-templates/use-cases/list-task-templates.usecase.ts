import { Injectable } from "@nestjs/common";
import { TaskTemplatesRepository } from "../repositories/task-templates.repository";

@Injectable()
export class ListTaskTemplatesUseCase {
  constructor(private readonly repo: TaskTemplatesRepository) {}

  execute() {
    return this.repo.findAll();
  }
}
