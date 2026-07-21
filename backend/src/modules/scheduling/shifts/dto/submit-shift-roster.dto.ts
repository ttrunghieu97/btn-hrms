import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches, IsInt, Min } from 'class-validator';

export class SubmitShiftRosterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  submittedByUserId?: string;

  @ApiPropertyOptional({ description: 'Expected version of the roster for optimistic locking' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

