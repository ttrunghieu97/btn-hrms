import { ApiProperty } from "@nestjs/swagger";

export class EmployeeDocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  documentType: string;

  @ApiProperty()
  fileId: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}

