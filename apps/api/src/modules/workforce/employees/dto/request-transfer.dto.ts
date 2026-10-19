import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class RequestTransferDto {
  @ApiProperty() @IsString() effectiveDate!: string;
  @ApiProperty() @IsString() toDepartmentId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() toPositionId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() toManagerEmployeeId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() toJobTitle?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}

export class RejectTransferDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}
