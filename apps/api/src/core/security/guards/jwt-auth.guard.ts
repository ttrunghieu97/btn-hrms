import { CanActivate, ExecutionContext, Injectable, Inject } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AuthUser } from "../types/auth-user.interface";
import { IPermissionReader } from "../../../contracts/ports/permission-reader.port";
import { IAuthSessionReader } from "../../../contracts/ports/auth-session-reader.port";
import { CONTRACTS_TOKENS } from "../../../contracts/contracts.tokens";
import { RolesRepository } from "../roles/roles.repository";
import { PermissionHierarchyResolver } from "../permissions/permission-hierarchy.resolver";
import {
  assertCookieCsrfSafeRequest,
  type CsrfRequestLike,
  normalizeOriginUrl,
  parseHostHeaderValue,
} from "../../../shared/utils/cookie-csrf.util";
import { throwUnauthorized } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../shared/constants/error-reasons";
import { getScopeId } from "../../../shared/constants/system";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(CONTRACTS_TOKENS.PERMISSION_READER_PORT)
    private readonly permissionReader: IPermissionReader,
    @Inject(CONTRACTS_TOKENS.AUTH_SESSION_READER_PORT)
    private readonly authSessionReader: IAuthSessionReader,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    private readonly rolesRepo: RolesRepository,
    private readonly hierarchyResolver: PermissionHierarchyResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const headerToken = this.getBearerToken(request.headers.authorization);
    const accessCookieName =
      this.configService.get<string>("AUTH_ACCESS_COOKIE_NAME") || "access_token";
    const cookieToken = this.getCookieValue(request.headers.cookie, accessCookieName);
    const token = headerToken ?? cookieToken;

    if (!token) {
      throwUnauthorized("No token provided", ERROR_CODES.AUTH_TOKEN_MISSING, {
        reason: ERROR_REASONS.MISSING_TOKEN,
      });
    }

    if (!headerToken && cookieToken) {
      this.assertCookieCsrfSafe(request);
    }

    let payload: { sub: string; email: string; azv?: number };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("AUTH_JWT_SECRET"),
      });
    } catch {
      throwUnauthorized("Invalid or expired token", ERROR_CODES.AUTH_TOKEN_INVALID, {
        reason: ERROR_REASONS.INVALID_TOKEN,
      });
    }

    const session = await this.authSessionReader.loadAuthSession(payload.sub);
    const sessionUser = session?.user as { isActive?: boolean } | undefined;
    const isActive =
      typeof sessionUser?.isActive === "boolean"
        ? sessionUser.isActive
        : await this.authSessionReader.isAuthUserActive(payload.sub);
    if (!session?.user || !isActive) {
      throwUnauthorized("User not authenticated", ERROR_CODES.USER_NOT_AUTHENTICATED, {
        userId: payload.sub ?? null,
        reason: ERROR_REASONS.MISSING_USER_ID,
      });
    }

    const dbUser = session.user;

    // Reject tokens issued before the last authorization state change.
    // This provides immediate revocation without short-lived tokens.
    const tokenVersion = payload.azv ?? 0;
    if (tokenVersion < (dbUser.authorizationVersion ?? 1)) {
      throwUnauthorized(
        "Authorization state has changed. Please sign in again.",
        ERROR_CODES.AUTH_TOKEN_OUTDATED,
        { reason: ERROR_REASONS.INVALID_TOKEN },
      );
    }
    const employeeRow = session.employee;

    let effectivePermissions: string[];
    let roleNames: string[];

    if (dbUser.isSuperAdmin) {
      effectivePermissions = ["sys:all"];
      roleNames = ["super_admin"];
    } else {
      const [directPerms, roleContext] = await Promise.all([
        this.permissionReader.getPermissions(dbUser.id),
        this.rolesRepo.findRoleContextByUserId(dbUser.id),
      ]);
      roleNames = roleContext.roleNames;

      const merged = [...new Set([...directPerms, ...roleContext.permissions])];

      if (merged.includes("sys:all")) {
        effectivePermissions = ["sys:all"];
      } else {
        effectivePermissions = this.hierarchyResolver.expand(merged);
      }
    }

    const scopeId = getScopeId();

    const authUser: AuthUser = {
      id: dbUser.id,
      userId: dbUser.id,
      username: dbUser.username,
      employeeId: employeeRow?.id,
      scopeId,
      departmentId: employeeRow?.departmentId ?? null,
      permissions: effectivePermissions,
      roles: roleNames,
      isSuperAdmin: dbUser.isSuperAdmin,
      avatar: null,
    };

    request.user = authUser;
    return true;
  }

  private assertCookieCsrfSafe(request: CsrfRequestLike): void {
    const method = String(request.method || "GET").toUpperCase();
    if (!STATE_CHANGING_METHODS.has(method)) {
      return;
    }

    const configuredOrigins = [
      this.configService?.get<string>("APP_URL"),
      this.configService?.get<string>("CORS_ORIGIN"),
      this.configService?.get<string>("FRONTEND_URL"),
      process.env.APP_URL,
      process.env.CORS_ORIGIN,
      process.env.FRONTEND_URL,
    ];

    const allowedOrigins = new Set<string>();
    const configuredPorts = new Set<string>(["8080", "3000"]);

    for (const entry of configuredOrigins) {
      if (!entry) continue;
      for (const item of String(entry).split(",")) {
        const cleaned = item.trim();
        if (!cleaned || cleaned === "*") continue;
        const normalized = normalizeOriginUrl(cleaned);
        if (normalized) {
          allowedOrigins.add(normalized);
          try {
            const parsed = new URL(normalized);
            if (parsed.port) configuredPorts.add(parsed.port);
          } catch {
            // ignore
          }
        }
      }
    }

    const nodeEnv = this.configService?.get<string>("NODE_ENV") ?? process.env.NODE_ENV;
    if (nodeEnv !== "production") {
      const rawDevOrigins =
        this.configService?.get<string>("ALLOWED_DEV_ORIGINS") ??
        process.env.ALLOWED_DEV_ORIGINS;
      if (rawDevOrigins) {
        for (const entry of String(rawDevOrigins).split(",")) {
          const trimmed = entry.trim().replace(/\/+$/, "");
          if (!trimmed) continue;
          if (/^https?:\/\//i.test(trimmed)) {
            const normalized = normalizeOriginUrl(trimmed);
            if (normalized) allowedOrigins.add(normalized);
            continue;
          }
          const parsedHost = parseHostHeaderValue(trimmed);
          if (parsedHost) {
            allowedOrigins.add(`http://${parsedHost.host}`);
            allowedOrigins.add(`https://${parsedHost.host}`);
            if (!parsedHost.port) {
              for (const port of configuredPorts) {
                allowedOrigins.add(`http://${parsedHost.hostname}:${port}`);
                allowedOrigins.add(`https://${parsedHost.hostname}:${port}`);
              }
            }
          }
        }
      }
    }

    const trustProxy =
      this.configService?.get<string>("TRUST_PROXY") ?? process.env.TRUST_PROXY ?? 1;
    const trustedProxyIps =
      this.configService?.get<string>("TRUSTED_PROXY_IPS") ??
      process.env.TRUSTED_PROXY_IPS;

    assertCookieCsrfSafeRequest(request, {
      allowedOrigins,
      trustProxy,
      trustedProxyIps,
      allowDevLanSameOrigin: nodeEnv !== "production",
      contextLabel: "mutation",
    });
  }

  private getCookieValue(cookieHeader: string | undefined, name: string) {
    if (!cookieHeader) return undefined;
    for (const part of cookieHeader.split(";")) {
      const [k, ...rest] = part.trim().split("=");
      if (k === name) return decodeURIComponent(rest.join("="));
    }
    return undefined;
  }

  private getBearerToken(authorizationHeader?: string) {
    if (!authorizationHeader) return undefined;
    const [scheme, token] = authorizationHeader.split(" ");
    if (!scheme || !token) return undefined;
    if (scheme.toLowerCase() !== "bearer") return undefined;
    return token;
  }
}
