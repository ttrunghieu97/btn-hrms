import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class SubmitApplicationDto {
  @ApiProperty()
  @IsUUID()
  postingId!: string;

  @ApiProperty()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  fullName!: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ description: "Temp upload token for the candidate CV" })
  @IsOptional()
  @IsString()
  cvFileToken?: string;
}
