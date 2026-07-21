import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Transform, Type } from "class-transformer";
import { PagedQueryDto, clampPaginationLimit } from "../../../../shared/dto/pagination.dto";

const CONTRACT_TYPES = [
  "permanent", "fixed_term", "probationary", "internship", "service", "part_time",
] as const;

const CONTRACT_STATUSES = ["draft", "active", "terminated", "superseded"] as const;

export class ListContractsQueryDto extends PagedQueryDto {
  @ApiPropertyOptional({ description: "Free-text search (name, code, contract number)" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ enum: CONTRACT_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(CONTRACT_TYPES)
  contractType?: (typeof CONTRACT_TYPES)[number];

  @ApiPropertyOptional({ enum: CONTRACT_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(CONTRACT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: "Filter contracts expiring within N days" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiresWithin?: number;

  @ApiPropertyOptional({ example: "effectiveFrom:desc" })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiProperty({ enum: CONTRACT_TYPES, default: "permanent" })
  @IsString()
  @IsIn(CONTRACT_TYPES)
  contractType!: (typeof CONTRACT_TYPES)[number];

  @ApiProperty({ description: "YYYY-MM-DD" })
  @IsString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ description: "YYYY-MM-DD" })
  @IsOptional()
  @IsString()
  effectiveTo?: string;

  @ApiPropertyOptional({ description: "YYYY-MM-DD" })
  @IsOptional()
  @IsString()
  signedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateContractDto {
  @ApiPropertyOptional({ enum: CONTRACT_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(CONTRACT_TYPES)
  contractType?: (typeof CONTRACT_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiPropertyOptional({ description: "YYYY-MM-DD" })
  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ description: "YYYY-MM-DD. Set null to remove end date." })
  @IsOptional()
  effectiveTo?: string | null;

  @ApiPropertyOptional({ description: "YYYY-MM-DD" })
  @IsOptional()
  @IsString()
  signedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string | null;
}
