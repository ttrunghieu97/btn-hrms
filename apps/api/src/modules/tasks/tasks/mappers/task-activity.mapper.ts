import { type TaskActivityResponseDto } from "../dto/task-activity-response.dto";

export class TaskActivityMapper {
  static toResponseDto(row: any  ): TaskActivityResponseDto {
    const actor = row?.actor;

    return {
      id: row.id,
      taskId: row.taskId,
      actorUserId: row.actorUserId ?? null,
      action: row.action,
      fromStatus: row.fromStatus ?? null,
      toStatus: row.toStatus ?? null,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt,
      actor: actor
        ? {
            id: actor.id,
            username: actor.username,
            email: actor.email ?? null,
          }
        : undefined,
    };
  }

  static toResponseDtos(rows: any[]  ): TaskActivityResponseDto[] {
    return rows.map((row) => TaskActivityMapper.toResponseDto(row));
  }
}



