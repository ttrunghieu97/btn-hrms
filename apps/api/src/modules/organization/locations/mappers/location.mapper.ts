import { type LocationResponseDto } from "../dto/location-response.dto";

export class LocationMapper {
  static toResponseDto(row: any  ): LocationResponseDto | null {
    if (!row) return null;

    const childrenDtos = row.children
      ? row.children
          .map((child: any) => this.toResponseDto(child))
          .filter((dto: LocationResponseDto | null): dto is LocationResponseDto =>
            Boolean(dto),
          )
      : undefined;

    const parentDto = row.parent ? this.toResponseDto(row.parent) : null;

    return {
      id: row.id,
      parentId: row.parentId ?? null,
      name: row.name,
      type: row.type,
      address: row.address ?? null,
      latitude: row.latitude ? row.latitude.toString() : null,
      longitude: row.longitude ? row.longitude.toString() : null,
      radiusMeters: row.radiusMeters ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...(childrenDtos ? { children: childrenDtos } : {}),
      ...(parentDto ? { parent: parentDto } : {}),
    };
  }

  static toResponseDtos(rows: any[]  ): LocationResponseDto[] {
    if (!rows) return [];
    return rows
      .map((row) => this.toResponseDto(row))
      .filter((dto: LocationResponseDto | null): dto is LocationResponseDto =>
        Boolean(dto),
      );
  }
}



