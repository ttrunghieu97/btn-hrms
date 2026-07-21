import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAccessGrantRequestDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;

  @ApiProperty({ example: 'payroll:view:all' })
  @IsString()
  @IsNotEmpty()
  permissionCode!: string;

  @ApiProperty({ example: 'Covering payroll close for May 2026.' })
  @IsString()
  @MinLength(10)
  reason!: string;

  @ApiProperty({ example: '2026-05-31T23:59:59.000Z' })
  @IsDateString()
  expiresAt!: string;
}
