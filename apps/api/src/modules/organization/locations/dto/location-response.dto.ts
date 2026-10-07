import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

export class LocationResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  parentId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: locationTypeValues })
  type: LocationType;

  @ApiPropertyOptional()
  address: string | null;

  @ApiPropertyOptional()
  latitude: string | null;

  @ApiPropertyOptional()
  longitude: string | null;

  @ApiPropertyOptional()
  radiusMeters: number | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => LocationResponseDto, isArray: true })
  children?: LocationResponseDto[];

  @ApiPropertyOptional({ type: () => LocationResponseDto })
  parent?: LocationResponseDto;
}


