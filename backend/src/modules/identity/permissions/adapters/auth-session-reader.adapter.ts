import { Injectable } from "@nestjs/common";
import { IAuthSession, IAuthSessionReader } from "../../../../contracts/ports/auth-session-reader.port";
import { SecurityRepository } from "../../../../infrastructure/security/security.repository";

@Injectable()
export class AuthSessionReaderAdapter implements IAuthSessionReader {
  constructor(private readonly securityRepository: SecurityRepository) {}

  async loadAuthSession(userId: string): Promise<IAuthSession | null> {
    return this.securityRepository.loadAuthSession(userId);
  }

  async isAuthUserActive(userId: string): Promise<boolean> {
    return this.securityRepository.isAuthUserActive(userId);
  }
}
