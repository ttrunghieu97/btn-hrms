import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { CreatePayrollPeriodDto } from "./create-payroll-period.dto";

export class UpdatePayrollPeriodDto extends PartialType(
  CreatePayrollPeriodDto,
) {
  @ApiPropertyOptional({ enum: ["draft", "open", "closed"] })
  @IsOptional()
  @IsString()
  @IsIn(["draft", "open", "closed"])
  override status?: string;
}



