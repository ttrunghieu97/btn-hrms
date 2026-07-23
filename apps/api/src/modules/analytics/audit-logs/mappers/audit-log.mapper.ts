import { type AuditLogResponseDto } from "../dto/audit-log-response.dto";
import { type CreateAuditLogDto } from "../dto/create-audit-log.dto";
import { type UpdateAuditLogDto } from "../dto/update-audit-log.dto";

export class AuditLogMapper {
  static toResponseDto(row: any  ): AuditLogResponseDto {
    if (!row) {
      throw new Error(
        "Cannot map a null or undefined row to AuditLogResponseDto",
      );
    }

    return {
      id: row.id,
      actorUserId: row.actorUserId ?? null,
      actor: row.actor
        ? {
            id: row.actor.id,
            username: row.actor.username,
            email: row.actor.email ?? null,
          }
        : null,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId ?? null,
      result: row.result ?? null,
      reason: row.reason ?? null,
      traceId: row.traceId ?? null,
      metadata: this.parseMetadata(row.metadata),
      createdAt: row.createdAt,
    };
  }

  static toResponseDtos(rows: any[]  ): AuditLogResponseDto[] {
    return (rows || [])
      .filter((row) => row != null)
      .map((row) => this.toResponseDto(row));
  }

  static toEntity(dto: CreateAuditLogDto | UpdateAuditLogDto) {
    if (!dto) return {};

    const hasActorUserId = "actorUserId" in dto;

    return {
      ...(hasActorUserId && dto.actorUserId !== undefined
        ? { actorUserId: dto.actorUserId }
        : {}),
      ...(dto.action !== undefined ? { action: dto.action } : {}),
      ...(dto.entity !== undefined ? { entity: dto.entity } : {}),
      ...(dto.entityId !== undefined ? { entityId: dto.entityId } : {}),
      ...(dto.metadata !== undefined ? { metadata: dto.metadata ?? null } : {}),
    };
  }

  private static parseMetadata(raw: unknown) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== "string") return raw;

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}

