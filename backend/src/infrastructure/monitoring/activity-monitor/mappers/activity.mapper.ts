import type { ActivityRow } from "../repositories/activity.repository";
import type { ActivityResponseDto } from "../dto/activity-response.dto";

export class ActivityMapper {
  static toResponseDto(row: ActivityRow): ActivityResponseDto {
    return {
      id: row.id,
      actorUserId: row.actorUserId ?? "",
      actorName: row.actorName ?? undefined,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId ?? undefined,
      metadata: row.metadata ?? undefined,
      createdAt: row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    };
  }

  static toResponseDtos(rows: ActivityRow[]): ActivityResponseDto[] {
    return rows.map((row) => this.toResponseDto(row));
  }
}
