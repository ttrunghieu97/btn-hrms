import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsNotEmpty } from "class-validator";

export class CreateGPSLogDto {
  @ApiProperty({ description: "Latitude coordinate" })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ description: "Longitude coordinate" })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}

