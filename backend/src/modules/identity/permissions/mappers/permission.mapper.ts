import { type CreatePermissionRequestDto } from "../dto/create-permission.dto";
import { type PermissionResponseDto } from "../dto/permission-response.dto";
import { type UpdatePermissionRequestDto } from "../dto/update-permission.dto";

interface PermissionRow {
  code: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PermissionMapper {
  static toResponseDto(row: PermissionRow): PermissionResponseDto | null {
    if (!row) return null;

    return {
      code: row.code,
      description: row.description || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseDtos(rows: PermissionRow[]): PermissionResponseDto[] {
    return rows
      .map((row) => this.toResponseDto(row))
      .filter((dto): dto is PermissionResponseDto => dto !== null);
  }

  static toEntity(dto: CreatePermissionRequestDto | UpdatePermissionRequestDto) {
    if (!dto) return {};

    const hasCode = "code" in dto;

    return {
      ...(hasCode && dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
    };
  }
}
