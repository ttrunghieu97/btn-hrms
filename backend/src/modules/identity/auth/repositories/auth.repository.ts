import { Inject, Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { and, eq, isNull, isNotNull, lt, gt, or } from "drizzle-orm";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { AuditLogPort } from "../../../../contracts/ports/audit-log.port";

export type AuthTransaction = PostgresJsDatabase<typeof schema>;
export type NewRefreshToken = typeof schema.refreshTokens.$inferInsert;
export type RefreshTokenRecord = typeof schema.refreshTokens.$inferSelect;

@Injectable()
export class AuthRepository extends BaseRepository<
  RefreshTokenRecord,
  NewRefreshToken,
  Partial<NewRefreshToken>
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
  ) {
    super();
  }

  async transaction<T>(fn: (tx: AuthTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findById(id: string) {
    const row = await this.db.query.refreshTokens.findFirst({
      where: eq(schema.refreshTokens.id, id),
    });
    return row ?? null;
  }

  async findMany() {
    return this.db.select().from(schema.refreshTokens);
  }

  async create(data: typeof schema.refreshTokens.$inferInsert) {
    const [row] = await this.db
      .insert(schema.refreshTokens)
      .values(data)
      .returning();
    return row ?? null;
  }

  async update(
    id: string,
    data: Partial<typeof schema.refreshTokens.$inferInsert>,
  ) {
    const [row] = await this.db
      .update(schema.refreshTokens)
      .set(data)
      .where(eq(schema.refreshTokens.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    await db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.id, id));
  }

  findUserForLogin(usernameOrEmail: string) {
    return this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        passwordHash: schema.users.passwordHash,
        isSuperAdmin: schema.users.isSuperAdmin,
        isActive: schema.users.isActive,
        mustChangePassword: schema.users.mustChangePassword,
        authorizationVersion: schema.users.authorizationVersion,
      })
      .from(schema.users)
      .where(
        usernameOrEmail.includes("@")
          ? eq(schema.users.email, usernameOrEmail)
          : eq(schema.users.username, usernameOrEmail),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }


  findUserById(userId: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
  }

  async updateLastLoginAt(userId: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    await db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async updateUserPasswordHash(userId: string, passwordHash: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, userId))
      .returning();
    return row ?? null;
  }

  deleteRefreshTokenByIdAndUser(tokenId: string, userId: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    return db
      .delete(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.id, tokenId),
          eq(schema.refreshTokens.userId, userId),
        ),
      );
  }

  async revokeAllRefreshTokens(userId: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const rows = await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.refreshTokens.userId, userId),
          isNull(schema.refreshTokens.revokedAt),
        ),
      )
      .returning({ id: schema.refreshTokens.id });
    return rows.length;
  }

  revokeRefreshTokenFamily(userId: string, tx?: PostgresJsDatabase<typeof schema>) {
    return this.revokeAllRefreshTokens(userId, tx);
  }

  async createSecurityAuditLog(values: {
    actorUserId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: unknown;
  }) {
    await this.auditLog.write({
      actorUserId: values.actorUserId ?? undefined,
      action: values.action,
      entity: values.entity,
      entityId: values.entityId ?? undefined,
      metadata: values.metadata,
    });
    return null;
  }

  async recordFailedLoginAudit(values: {
    actorUserId?: string | null;
    username: string;
    reason: string;
    clientIp?: string | null;
    userAgent?: string | null;
  }) {
    return this.createSecurityAuditLog({
      actorUserId: values.actorUserId ?? null,
      action: "auth_login_failed",
      entity: "auth",
      entityId: values.actorUserId ?? null,
      metadata: {
        username: values.username,
        reason: values.reason,
        clientIp: values.clientIp ?? null,
        userAgent: values.userAgent ?? null,
      },
    });
  }

  async recordRefreshTokenReuseAudit(values: {
    actorUserId?: string | null;
    tokenId: string;
    clientIp?: string | null;
    userAgent?: string | null;
  }) {
    return this.createSecurityAuditLog({
      actorUserId: values.actorUserId ?? null,
      action: "auth_refresh_token_reuse_detected",
      entity: "auth",
      entityId: values.tokenId,
      metadata: {
        tokenId: values.tokenId,
        clientIp: values.clientIp ?? null,
        userAgent: values.userAgent ?? null,
      },
    });
  }

  async withBestEffortSecurityAudit<T>(callback: () => Promise<T>) {
    try {
      return await callback();
    } catch {
      return null;
    }
  }

  async recordFailedLogin(values: {
    actorUserId?: string | null;
    username: string;
    reason: string;
    clientIp?: string | null;
    userAgent?: string | null;
  }) {
    return this.withBestEffortSecurityAudit(() =>
      this.recordFailedLoginAudit(values),
    );
  }

  async recordRefreshTokenReuse(values: {
    actorUserId?: string | null;
    tokenId: string;
    clientIp?: string | null;
    userAgent?: string | null;
  }) {
    return this.withBestEffortSecurityAudit(() =>
      this.recordRefreshTokenReuseAudit(values),
    );
  }

  findActiveRefreshToken(tokenId: string, userId: string, gracePeriodMs = 30_000) {
    const graceThreshold = new Date(Date.now() - gracePeriodMs);
    return this.db.query.refreshTokens.findFirst({
      where: and(
        eq(schema.refreshTokens.id, tokenId),
        eq(schema.refreshTokens.userId, userId),
        isNull(schema.refreshTokens.revokedAt),
        or(
          isNull(schema.refreshTokens.supersededAt),
          gt(schema.refreshTokens.supersededAt, graceThreshold),
        ),
      ),
    });
  }

  supersedeRefreshToken(tokenId: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    return db
      .update(schema.refreshTokens)
      .set({ supersededAt: new Date() })
      .where(eq(schema.refreshTokens.id, tokenId));
  }

  deleteRefreshTokenById(tokenId: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    return db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.id, tokenId));
  }

  revokeRefreshTokenById(tokenId: string, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    return db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.id, tokenId));
  }

  insertRefreshToken(values: NewRefreshToken, tx?: AuthTransaction) {
    const db = tx ?? this.db;
    return db.insert(schema.refreshTokens).values(values);
  }

  listRefreshTokens() {
    return this.db.select().from(schema.refreshTokens);
  }

  async deleteExpiredOrRevokedRefreshTokens(now: Date, tx?: PostgresJsDatabase<typeof schema>) {
    const db = tx ?? this.db;
    const supersededGrace = new Date(now.getTime() - 60_000);
    const deleted = await db
      .delete(schema.refreshTokens)
      .where(
        or(
          lt(schema.refreshTokens.expiresAt, now),
          isNotNull(schema.refreshTokens.revokedAt),
          and(
            isNotNull(schema.refreshTokens.supersededAt),
            lt(schema.refreshTokens.supersededAt, supersededGrace),
          ),
        ),
      )
      .returning({ id: schema.refreshTokens.id });
    return deleted.length;
  }
}
