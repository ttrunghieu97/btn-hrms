import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class AuthUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  isSuperAdmin: boolean;

  @ApiProperty({ type: [String] })
  permissions: string[];
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiPropertyOptional({
    description:
      "Deprecated: refresh token is delivered via httpOnly cookie in production.",
  })
  refresh_token?: string;

  @ApiPropertyOptional({ description: "Access token lifetime in seconds" })
  expires_in?: number;

  @ApiPropertyOptional({ type: AuthUserDto })
  user?: AuthUserDto;
}
