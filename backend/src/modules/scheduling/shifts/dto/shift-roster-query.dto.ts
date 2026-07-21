import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID, Matches } from "class-validator";

export class ShiftRosterQueryDto {
  @ApiProperty({ description: "YYYY-MM-DD" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiProperty({ description: "YYYY-MM-DD" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

