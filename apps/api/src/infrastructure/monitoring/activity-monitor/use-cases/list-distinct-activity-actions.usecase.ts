import { Injectable } from "@nestjs/common";
import { ActivityRepository } from "../repositories/activity.repository";

@Injectable()
export class ListDistinctActivityActionsUseCase {
  constructor(private readonly activityRepo: ActivityRepository) {}

  async execute() {
    const actions = await this.activityRepo.findDistinctActions();
    return { data: actions };
  }
}
