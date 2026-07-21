import { ApiProperty } from "@nestjs/swagger";
import { IsArray } from "class-validator";

export class BulkArchiveDto {
  @ApiProperty() @IsArray() employeeIds!: string[];
}
