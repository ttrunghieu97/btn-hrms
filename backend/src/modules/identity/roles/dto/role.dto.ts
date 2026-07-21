import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class CreateRoleRequestDto {
  @ApiProperty({ description: 'Tên nhóm quyền' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Mã định danh duy nhất cho role (tự động tạo từ name nếu không truyền)' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Mô tả nhóm quyền' })
  @IsString()
  @IsOptional()
  description?: string;


  @ApiPropertyOptional({ description: 'Cấp độ quyền (level)', default: 0 })
  @IsNumber()
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: 'Đánh dấu đây là role hệ thống (không thể xóa)', default: false })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'Danh sách mã quyền (permission codes)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class UpdateRoleRequestDto {
  @ApiPropertyOptional({ description: 'Tên nhóm quyền' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Mô tả nhóm quyền' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Cấp độ quyền (level)' })
  @IsNumber()
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: 'Danh sách mã quyền (permission codes)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class RoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  level: number;

  @ApiProperty()
  isSystem: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [String] })
  permissions: string[];
}
