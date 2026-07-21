import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, Matches } from "class-validator";

export class CreateOfferDto {
  @ApiProperty()
  @IsUUID()
  applicationId!: string;

  @ApiProperty({ description: "Decimal string, e.g. 2000.00" })
  @Matches(/^\d+(\.\d{1,2})?$/)
  compensation!: string;

  @ApiProperty({ description: "ISO date YYYY-MM-DD" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiPropertyOptional({ description: "ISO date YYYY-MM-DD" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expiresAt?: string;
}
