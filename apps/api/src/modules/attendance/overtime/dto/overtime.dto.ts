import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class SubmitOvertimeRequestDto {
  @ApiProperty({ example: "2026-04-14" })
  @IsNotEmpty()
  @IsDateString()
  workDate: string;

  @ApiProperty({ example: 120, description: "Requested overtime in minutes" })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  requestedMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestNote?: string;
}

export class ApproveOvertimeDto {
  @ApiPropertyOptional({
    description: "Optional override for approved minutes",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  approvedMinutes?: number;
}

export class RejectOvertimeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class OvertimeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["pending", "approved", "rejected", "cancelled"])
  status?: "pending" | "approved" | "rejected" | "cancelled";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workDate?: string;
}



