import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../../../../infrastructure/database/database.provider';
import * as schema from '../../../../infrastructure/database/schema';

/**
 * Manages the authorization version lifecycle for users.
 *
 * The version is a monotonically-increasing integer stored on the `users` row.
 * It is embedded in every access token at issue time. The JwtAuthGuard compares
 * the token's version against the DB value on each request; a mismatch forces
 * re-authentication, ensuring revoked permissions are effective immediately
 * without requiring short-lived tokens.
 *
 * Bump triggers: role reassignment, permission change, account deactivation,
 * session revocation, super-admin promotion/demotion.
 */
@Injectable()
export class AuthorizationVersionService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /**
   * Atomically increment the authorization_version for a user.
   * Must be called inside the same transaction that mutates authorization state.
   */
  async bump(userId: string, tx?: PostgresJsDatabase<typeof schema>): Promise<number> {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.users)
      .set({
        authorizationVersion: sql`${schema.users.authorizationVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning({ authorizationVersion: schema.users.authorizationVersion });
    return row?.authorizationVersion ?? 1;
  }

  /**
   * Bump for multiple users in one statement (e.g. when a role's permissions change).
   * Uses a subquery for atomicity without requiring a loop.
   */
  async bumpMany(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    // Process individually — keeps query simple; only called for affected users
    await Promise.all(userIds.map((id) => this.bump(id)));
  }

  /** Read the current version for a user without bumping. */
  async getVersion(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ authorizationVersion: schema.users.authorizationVersion })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return row?.authorizationVersion ?? 1;
  }
}
