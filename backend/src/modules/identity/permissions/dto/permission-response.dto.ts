import { ApiProperty } from "@nestjs/swagger";

export class PermissionResponseDto {
  @ApiProperty()
  code: string;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
