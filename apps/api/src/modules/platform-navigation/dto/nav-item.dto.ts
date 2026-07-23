import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class NavItemBadgeDto {
  @ApiProperty({ enum: ["beta", "new", "soon", "maintenance"] })
  type: "beta" | "new" | "soon" | "maintenance";

  @ApiPropertyOptional()
  label?: string;
}

class NavItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  href: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional({
    enum: ["enabled", "disabled", "beta", "coming_soon", "maintenance"],
  })
  state?: string;

  @ApiPropertyOptional({ type: NavItemBadgeDto })
  badge?: NavItemBadgeDto;

  @ApiPropertyOptional({ type: [NavItemDto] })
  children?: NavItemDto[];
}

export class NavGroupDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ type: [NavItemDto] })
  items: NavItemDto[];
}

export class NavResponseDto {
  @ApiProperty({ type: [NavGroupDto] })
  groups: NavGroupDto[];

  @ApiProperty()
  version: number;

  @ApiProperty()
  generatedAt: string;
}
