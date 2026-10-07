import { PartialType } from "@nestjs/swagger";
import { CreateEmployeeShiftAssignmentDto } from "./create-employee-shift-assignment.dto";

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class UpdateEmployeeShiftAssignmentDto extends PartialType(
  CreateEmployeeShiftAssignmentDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

