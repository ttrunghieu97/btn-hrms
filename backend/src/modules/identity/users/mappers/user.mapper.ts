import { type CreateUserRequestDto } from "../dto/create-user.dto";
import { type UpdateUserRequestDto } from "../dto/update-user.dto";
import { type UserResponseDto } from "../dto/user-response.dto";

interface UserPermissionRow {
  permissionCode: string;
}

interface UserRoleRow {
  roleId: string;
}

interface UserRow {
  id: string;
  username: string;
  email: string | null;
  isSuperAdmin?: boolean | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles?: { id: string; name: string }[];
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  } | null;
  userPermissions?: UserPermissionRow[];
  userRoles?: UserRoleRow[];
  permissions?: string[];
}

export class UserMapper {
  static toResponseDto(row: UserRow | null): UserResponseDto | null {
    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      isSuperAdmin: row.isSuperAdmin ?? false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      employeeUsername: row.employee
        ? `${row.employee.firstName} ${row.employee.lastName}`.trim()
        : undefined,
      permissions: row.userPermissions
        ? row.userPermissions.map((up) => up.permissionCode)
        : row.permissions,
      roleIds: row.userRoles ? row.userRoles.map((ur) => ur.roleId) : undefined,
      avatar: row.employee?.avatar ?? null,
      lastLoginAt: row.lastLoginAt ?? null,
      roles: row.roles?.length ? row.roles : undefined,
    };
  }

  static toResponseDtos(rows: UserRow[]): UserResponseDto[] {
    return rows
      .map((row) => this.toResponseDto(row))
      .filter((dto): dto is UserResponseDto => dto !== null);
  }

  static toEntity(dto: CreateUserRequestDto | UpdateUserRequestDto) {
    if (!dto) return {};

    return {
      ...(dto.username !== undefined ? { username: dto.username } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.passwordHash !== undefined
        ? { passwordHash: dto.passwordHash }
        : {}),
      ...(dto.isSuperAdmin !== undefined
        ? { isSuperAdmin: dto.isSuperAdmin }
        : {}),
    };
  }
}
