import { type CreateDepartmentDto } from "../dto/create-department.dto";
import { type DepartmentResponseDto } from "../dto/department-response.dto";
import { type UpdateDepartmentDto } from "../dto/update-department.dto";

interface DepartmentRow {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  employeeCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DepartmentMapper {
  static toResponseDto(row: DepartmentRow): DepartmentResponseDto {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      parentId: row.parentId ?? null,
      employeeCount: row.employeeCount ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseDtos(rows: DepartmentRow[]): DepartmentResponseDto[] {
    return rows.map((row) => this.toResponseDto(row));
  }

  static toEntity(dto: CreateDepartmentDto | UpdateDepartmentDto) {
    if (!dto) return {};

    return {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
    };
  }
}

