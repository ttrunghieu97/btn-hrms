import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "../../infrastructure/database/schema";
import { AuthRepository } from "../../modules/identity/auth/repositories/auth.repository";
import {
  type CreateUserInput,
  type IdentityAdminPort,
  type IdentityDb,
} from "../ports/identity-admin.port";

@Injectable()
export class IdentityAdminAdapter implements IdentityAdminPort {
  constructor(private readonly authRepo: AuthRepository) {}

  async createUser(
    input: CreateUserInput,
    tx: IdentityDb,
  ): Promise<{ id: string }> {
    const [row] = await tx
      .insert(schema.users)
      .values({
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        isSuperAdmin: input.isSuperAdmin,
        passwordResetTokenHash: input.passwordResetTokenHash ?? null,
        passwordResetTokenExpiresAt:
          input.passwordResetTokenExpiresAt ?? null,
        mustChangePassword: input.mustChangePassword ?? false,
        isActive: input.isActive ?? true,
      })
      .returning({ id: schema.users.id });
    if (!row) throw new Error("failed_to_create_user");
    return row;
  }

  async revokeSessions(userId: string, tx: IdentityDb): Promise<number> {
    return this.authRepo.revokeAllRefreshTokens(userId, tx);
  }

  async deleteUser(userId: string, tx: IdentityDb): Promise<void> {
    await tx.delete(schema.users).where(eq(schema.users.id, userId));
  }

  async deactivateUser(userId: string, tx: IdentityDb): Promise<void> {
    await this.revokeSessions(userId, tx);
    await tx
      .update(schema.users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async reactivateUser(userId: string, tx: IdentityDb): Promise<void> {
    await tx
      .update(schema.users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }
}
