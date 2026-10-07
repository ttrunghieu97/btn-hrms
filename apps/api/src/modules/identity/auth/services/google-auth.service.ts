import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class GoogleAuthService {
  constructor(private readonly configService: ConfigService) {}

  async verifyToken(idToken: string): Promise<GoogleTokenPayload> {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown");
      throw new Error(`Google token verification failed: ${res.status} ${text}`);
    }

    const payload = await res.json() as Record<string, unknown>;

    if (!payload.sub || !payload.email) {
      throw new Error("Google token missing sub or email");
    }

    // 1. Validate Audience (aud) against configured GOOGLE_CLIENT_ID
    const expectedClientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    if (!expectedClientId || !expectedClientId.trim()) {
      throw new Error("Google SSO is disabled or not configured: GOOGLE_CLIENT_ID is missing");
    }
    if (payload.aud !== expectedClientId) {
      throw new Error(`Google token audience mismatch: expected ${expectedClientId}, got ${payload.aud}`);
    }

    // 2. Validate email is verified
    const isEmailVerified = payload.email_verified === "true" || payload.email_verified === true;
    if (!isEmailVerified) {
      throw new Error("Google account email is not verified");
    }

    // 3. Validate issuer
    const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
    if (payload.iss && !validIssuers.includes(payload.iss as string)) {
      throw new Error(`Invalid Google token issuer: ${payload.iss}`);
    }

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
    };
  }
}
