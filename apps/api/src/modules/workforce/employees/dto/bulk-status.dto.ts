import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, IsOptional } from "class-validator";

export class BulkStatusDto {
  @ApiProperty() @IsArray() employeeIds!: string[];

  @ApiProperty() @IsString() status!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() effectiveDate?: string;
}
