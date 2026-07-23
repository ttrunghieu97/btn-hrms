import { Global, Module } from "@nestjs/common";
import { JwtModule, type JwtModuleOptions } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DatabaseModule } from "../database/database.module";
import { SecurityRepository } from "./security.repository";
import { ResourceLoaderRepository } from "./resource-loader.repository";
import { ResourceLoaderService } from "./resource-loader.service";

// --- New authorization layer ------------------------------------------
import { RolesRepository } from "../../core/security/roles/roles.repository";
import { PermissionHierarchyResolver } from "../../core/security/permissions/permission-hierarchy.resolver";
import { PolicyEngine } from "../../core/security/policy-engine/policy.engine";
import { AuthorizationService } from "../../core/security/authorization.service";
import { QueryScopeService } from "../../core/security/query-scope.service";
import { AuthorizationGuard } from "../../core/security/guards/authorization.guard";
import { AuthorizationAuditService } from "../../core/security/auth/authorization-audit.service";
import { AuthorizationAuditRepository } from "../../core/security/auth/authorization-audit.repository";
import { RequestContextModule } from "../../shared/context/request-context.module";
import { PermissionsModule } from "../../modules/identity/permissions/permissions.module";
import { CONTRACTS_TOKENS } from "../../contracts/contracts.tokens";
import { AuthSessionReaderAdapter } from "../../modules/identity/permissions/adapters/auth-session-reader.adapter";
import { ResourceContextReaderAdapter } from "../../modules/identity/permissions/adapters/resource-context-reader.adapter";
import { AuditLogAdapter } from "./audit-log.adapter";

/**
 * SecurityModule ? provides all infrastructure needed by the guards.
 *
 * Exported providers are consumed by AppModule (via APP_GUARD tokens)
 * and by JwtAuthGuard (injected in IdentityDomainModule's AuthModule).
 */
@Global()
@Module({
  imports: [
    DatabaseModule,
    RequestContextModule,
    PermissionsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>("AUTH_JWT_SECRET");
        if (!secret) {
          throw new Error("Missing AUTH_JWT_SECRET environment variable");
        }
        const expiresIn = configService.get<string>("AUTH_JWT_ACCESS_EXPIRES_IN");
        return {
          secret,
          signOptions: { expiresIn: (expiresIn ?? "30m") as any },
        };
      },
    }),
  ],
  providers: [
    // Infrastructure
    SecurityRepository,
    ResourceLoaderRepository,
    ResourceLoaderService,

    // Ports Adapters
    {
      provide: CONTRACTS_TOKENS.AUTH_SESSION_READER_PORT,
      useClass: AuthSessionReaderAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.RESOURCE_CONTEXT_READER_PORT,
      useClass: ResourceContextReaderAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.AUDIT_LOG_PORT,
      useClass: AuditLogAdapter,
    },

    // RBAC
    RolesRepository,

    // Policy engine components
    PermissionHierarchyResolver,
    PolicyEngine,
    AuthorizationService,
    QueryScopeService,
    AuthorizationAuditService,
    AuthorizationAuditRepository,

    // Guards (exported so AppModule can register them as APP_GUARD)
    AuthorizationGuard,
  ],
  exports: [
    SecurityRepository,
    ResourceLoaderService,
    RolesRepository,
    PermissionHierarchyResolver,
    PolicyEngine,
    AuthorizationService,
    QueryScopeService,
    AuthorizationAuditService,
    AuthorizationAuditRepository,
    AuthorizationGuard,
    PermissionsModule,
    JwtModule,
    CONTRACTS_TOKENS.AUTH_SESSION_READER_PORT,
    CONTRACTS_TOKENS.RESOURCE_CONTEXT_READER_PORT,
    CONTRACTS_TOKENS.AUDIT_LOG_PORT,
  ],
})
export class SecurityModule {}
