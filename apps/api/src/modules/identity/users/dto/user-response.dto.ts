import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiMetaDto, PaginatedMetaDto } from "../../../../shared/dto/api-response.dto";

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ type: String, nullable: true })
  email: string | null;

  @ApiProperty()
  isSuperAdmin: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  employeeUsername?: string;

  @ApiPropertyOptional({ type: [String] })
  permissions?: string[];

  @ApiPropertyOptional({ type: [String] })
  roleIds?: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  avatar?: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true, description: "Last successful login timestamp" })
  lastLoginAt: Date | null;

  @ApiPropertyOptional({ type: [Object], description: "Assigned roles with id and name" })
  roles?: { id: string; name: string }[];
}

export class UserMeResponseDto extends UserResponseDto {
  @ApiProperty({ type: [String] })
  permissions: string[];
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class UserEnvelopeResponseDto {
  @ApiProperty({ type: UserResponseDto })
  data: UserResponseDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class UserMeEnvelopeResponseDto {
  @ApiProperty({ type: UserMeResponseDto })
  data: UserMeResponseDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}
