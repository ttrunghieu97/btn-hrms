import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from "class-validator";
const LOCATION_TYPE_VALUES = [
  "office",
  "factory",
  "warehouse",
  "remote",
  "client_site",
  "hybrid",
] as const;

type LocationType = (typeof LOCATION_TYPE_VALUES)[number];
const locationTypeValues = LOCATION_TYPE_VALUES as readonly string[];

export class CreateLocationDto {
  @ApiPropertyOptional({ description: "Parent location ID for hierarchy" })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ description: "Location name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Location type",
    enum: locationTypeValues,
  })
  @IsEnum(locationTypeValues)
  @IsNotEmpty()
  type: LocationType;

  @ApiPropertyOptional({ description: "Physical address" })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: "Latitude for GPS geofencing" })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude for GPS geofencing" })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: "Radius in meters for geofencing" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  radiusMeters?: number;
}


