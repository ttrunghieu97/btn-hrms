import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class RequestTransferDto {
  @ApiProperty() @IsString() effectiveDate!: string;
  @ApiProperty() @IsString() toDepartmentId!: string;
  @ApiProperty() @IsOptional() @IsString() toPositionId?: string;
  @ApiProperty() @IsOptional() @IsString() toManagerEmployeeId?: string;
  @ApiProperty() @IsOptional() @IsString() toJobTitle?: string;
  @ApiProperty() @IsOptional() @IsString() reason?: string;
}
