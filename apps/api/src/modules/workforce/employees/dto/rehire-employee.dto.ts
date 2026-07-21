import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum } from "class-validator";

export class RehireEmployeeDto {
  @ApiProperty() @IsString() hireDate!: string;

  @ApiProperty({ enum: ["working", "probation"], default: "working" })
  @IsOptional()
  @IsEnum(["working", "probation"] as const)
  status?: "working" | "probation";

  @ApiProperty({ required: false }) @IsOptional() @IsString() departmentId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() positionId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() managerEmployeeId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() jobTitle?: string;
  @ApiProperty() @IsString() contractType!: string;
  @ApiProperty() @IsString() contractStatus!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}
