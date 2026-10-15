import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class CreatePayrollRunDto {
  @ApiProperty()
  @IsUUID()
  payrollPeriodId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ enum: ["draft"], default: "draft" })
  @IsOptional()
  @IsString()
  @IsIn(["draft"])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}



