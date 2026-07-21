import { ApiProperty } from "@nestjs/swagger";

export class QualificationResponseDto {
  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  positionId: string;

  @ApiProperty()
  positionName: string;

  @ApiProperty()
  createdAt: string;
}
