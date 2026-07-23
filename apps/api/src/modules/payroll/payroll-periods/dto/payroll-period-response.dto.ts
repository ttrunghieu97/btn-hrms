import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PayrollPeriodResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  startsOn!: string;

  @ApiProperty()
  endsOn!: string;

  @ApiPropertyOptional()
  payDate?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}



