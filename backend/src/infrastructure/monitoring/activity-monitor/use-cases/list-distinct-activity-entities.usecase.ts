import { Injectable } from "@nestjs/common";
import { ActivityRepository } from "../repositories/activity.repository";

@Injectable()
export class ListDistinctActivityEntitiesUseCase {
  constructor(private readonly activityRepo: ActivityRepository) {}

  async execute() {
    const entities = await this.activityRepo.findDistinctEntities();
    return { data: entities };
  }
}
