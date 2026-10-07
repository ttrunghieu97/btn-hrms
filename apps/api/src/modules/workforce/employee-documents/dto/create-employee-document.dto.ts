import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateEmployeeDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileId: string;
}

