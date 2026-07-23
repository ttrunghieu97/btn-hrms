import { type GPSLogResponseDto } from "../dto/gps-log-response.dto";

export class GPSLogMapper {
  static toResponseDto(row: any  ): GPSLogResponseDto | null {
    if (!row) return null;
    return {
      id: row.id,
      employeeId: row.employeeId,
      latitude: row.latitude.toString(),
      longitude: row.longitude.toString(),
      timestamp: row.timestamp,
    };
  }

  static toResponseDtos(rows: any[]  ): GPSLogResponseDto[] {
    if (!rows) return [];
    return rows
      .map((row) => this.toResponseDto(row))
      .filter((dto): dto is GPSLogResponseDto => Boolean(dto));
  }
}



