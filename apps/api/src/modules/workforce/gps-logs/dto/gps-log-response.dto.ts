import { ApiProperty } from "@nestjs/swagger";

export class GPSLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  latitude: string;

  @ApiProperty()
  longitude: string;

  @ApiProperty()
  timestamp: Date;
}

