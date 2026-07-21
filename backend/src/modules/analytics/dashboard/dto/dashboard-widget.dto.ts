import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class DashboardWidgetDto<TData = unknown> {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  executionTimeMs!: number;

  @ApiProperty()
  data!: TData;
}

class DashboardCacheMetaDto {
  @ApiProperty()
  hits!: number;

  @ApiProperty()
  misses!: number;
}

class DashboardMetaDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  durationMs!: number;

  @ApiProperty({ type: [String] })
  failedWidgets!: string[];

  @ApiProperty()
  widgetCount!: number;

  @ApiPropertyOptional({ type: DashboardCacheMetaDto })
  cache?: DashboardCacheMetaDto;
}

export class DashboardResponseEnvelopeDto {
  @ApiProperty({ type: [Object], description: "Array of dashboard widgets" })
  widgets!: DashboardWidgetDto[];

  @ApiProperty({ type: DashboardMetaDto })
  meta!: DashboardMetaDto;
}
