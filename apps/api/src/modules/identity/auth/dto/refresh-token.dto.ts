import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RefreshTokenRequestDto {
  @ApiPropertyOptional({
    description:
      "Refresh token string (legacy). In production, refresh token is provided via httpOnly cookie.",
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
