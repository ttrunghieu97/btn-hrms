import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsString, IsOptional } from "class-validator";
import { EMPLOYEE_STATUS_VALUES, type EmployeeStatusValue } from "./create-employee.dto";

export class BulkStatusDto {
  @ApiProperty() @IsArray() employeeIds!: string[];

  @ApiProperty({ enum: EMPLOYEE_STATUS_VALUES })
  @IsString()
  @IsIn(EMPLOYEE_STATUS_VALUES)
  status!: EmployeeStatusValue;

  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() effectiveDate?: string;
}
