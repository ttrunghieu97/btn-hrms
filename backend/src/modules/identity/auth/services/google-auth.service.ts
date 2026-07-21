import { Injectable } from "@nestjs/common";

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class GoogleAuthService {
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

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
    };
  }
}
