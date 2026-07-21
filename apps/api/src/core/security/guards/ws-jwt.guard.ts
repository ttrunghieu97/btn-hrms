import { CanActivate, ExecutionContext, Injectable, Logger, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { type Socket } from "socket.io";
import { AuthUser } from "../types/auth-user.interface";
import { IPermissionReader } from "../../../contracts/ports/permission-reader.port";
import { CONTRACTS_TOKENS } from "../../../contracts/contracts.tokens";
import { SecurityRepository } from "../../../infrastructure/security/security.repository";
import { RolesRepository } from "../roles/roles.repository";
import { PermissionHierarchyResolver } from "../permissions/permission-hierarchy.resolver";
import { getScopeId } from "../../../shared/constants/system";

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(CONTRACTS_TOKENS.PERMISSION_READER_PORT)
    private readonly permissionReader: IPermissionReader,
    private readonly configService: ConfigService,
    private readonly securityRepo: SecurityRepository,
    private readonly rolesRepo: RolesRepository,
    private readonly hierarchyResolver: PermissionHierarchyResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token =
      client.handshake.auth?.token ??
      this.getBearerToken(client.handshake.headers?.authorization);

    if (!token) {
      this.logger.warn("WS connection rejected: no token");
      client.disconnect();
      return false;
    }

    let payload: { sub: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("AUTH_JWT_SECRET"),
      });
    } catch {
      this.logger.warn("WS connection rejected: invalid token");
      client.disconnect();
      return false;
    }

    const session = await this.securityRepo.loadAuthSession(payload.sub);
    if (
      !session?.user ||
      !(await this.securityRepo.isAuthUserActive(payload.sub))
    ) {
      this.logger.warn("WS connection rejected: inactive user");
      client.disconnect();
      return false;
    }

    const dbUser = session.user;
    const employeeRow = session.employee;

    let effectivePermissions: string[];
    let roleNames: string[];

    if (dbUser.isSuperAdmin) {
      effectivePermissions = ["ALL"];
      roleNames = ["super_admin"];
    } else {
      const [directPerms, roleContext] = await Promise.all([
        this.permissionReader.getPermissions(dbUser.id),
        this.rolesRepo.findRoleContextByUserId(dbUser.id),
      ]);
      roleNames = roleContext.roleNames;
      const merged = [...new Set([...directPerms, ...roleContext.permissions])];
      if (merged.includes("sys:all")) {
        effectivePermissions = ["ALL"];
      } else {
        effectivePermissions = this.hierarchyResolver.expand(merged);
      }
    }

    const authUser: AuthUser = {
      id: dbUser.id,
      username: dbUser.username,
      employeeId: employeeRow?.id,
      scopeId: getScopeId(),
      departmentId: employeeRow?.departmentId ?? null,
      permissions: effectivePermissions,
      roles: roleNames,
      isSuperAdmin: dbUser.isSuperAdmin,
      avatar: null,
    };

    client.data.user = authUser;
    return true;
  }

  private getBearerToken(authorizationHeader?: string): string | undefined {
    if (!authorizationHeader) return undefined;
    const [scheme, token] = authorizationHeader.split(" ");
    if (!scheme || !token) return undefined;
    if (scheme.toLowerCase() !== "bearer") return undefined;
    return token;
  }
}
