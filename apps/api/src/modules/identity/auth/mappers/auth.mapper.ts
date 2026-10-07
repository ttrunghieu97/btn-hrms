import { type AuthResponseDto } from "../dto/auth-response.dto";

interface AuthUserPayload {
  id: string;
  username: string;
  email: string;
  isSuperAdmin: boolean;
  permissions: string[];
}

export class AuthMapper {
  static toAuthResponse(
    accessToken: string,
    refreshToken: string,
    user?: AuthUserPayload,
    expiresIn?: number,
  ): AuthResponseDto {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      ...(expiresIn !== undefined ? { expires_in: expiresIn } : {}),
      ...(user ? { user } : {}),
    };
  }
}
