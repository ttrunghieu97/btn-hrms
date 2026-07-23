import { Injectable, CanActivate, ExecutionContext, Inject } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { CHECK_POLICY_KEY } from "../decorators/check-policy.decorator";
import { REQUIRE_PERMISSION_KEY } from "../decorators/require-permission.decorator";
import {
  REQUIRE_POLICY_KEY,
  RequirePolicyMeta,
} from "../decorators/require-policy.decorator";
import {
  RESOURCE_KEY,
  type ResourceMetadata,
} from "../decorators/resource.decorator";
import { PolicyHandler } from "../policies/policy-handler.interface";
import { PolicyRegistry } from "../policies/policy.registry";
import { PolicyEngine } from "../policy-engine/policy.engine";
import { IResourceContextReader } from "../../../contracts/ports/resource-context-reader.port";
import { CONTRACTS_TOKENS } from "../../../contracts/contracts.tokens";
import { AuthorizationAuditService } from "../auth/authorization-audit.service";
import { throwForbidden } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../shared/constants/error-reasons";
import { AuthUser } from "../types/auth-user.interface";

interface AuthorizationRequest {
  user?: AuthUser;
  params?: Record<string, string | undefined>;
}

function getResourceId(resource: unknown): string | undefined {
  if (typeof resource !== "object" || resource === null || !("id" in resource)) {
    return undefined;
  }

  return typeof resource.id === "string" ? resource.id : undefined;
}

/**
 * AuthorizationGuard ? replaces the old PoliciesGuard.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyEngine: PolicyEngine,
    @Inject(CONTRACTS_TOKENS.RESOURCE_CONTEXT_READER_PORT)
    private readonly resourceContextReader: IResourceContextReader,
    private readonly auditService: AuthorizationAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ?? Public route ? skip ????????????????????????????????????????????????
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // ?? Collect all policy handlers for this route ?????????????????????????
    const handlers = this.resolveHandlers(context);

    // No authorization decorators → default-deny.
    // Routes MUST have @Public(), @CheckPolicy(), @RequirePolicy(), or @RequirePermission().
    if (handlers.length === 0) {
      throwForbidden(
        "No authorization policy configured for this endpoint",
        ERROR_CODES.PERMISSION_DENIED,
        { reason: "MISSING_AUTHORIZATION_DECORATOR" },
      );
    }

    const request = context.switchToHttp().getRequest<AuthorizationRequest>();
    const user = request.user;

    if (!user) {
      throwForbidden(
        "User not authenticated",
        ERROR_CODES.USER_NOT_AUTHENTICATED,
        {
          reason: ERROR_REASONS.NO_USER_IN_REQUEST,
        },
      );
    }

    // ?? Load resource (ABAC) ???????????????????????????????????????????????
    const resourceMeta = this.reflector.getAllAndOverride<ResourceMetadata>(
      RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );

    let resource: unknown = null;
    if (resourceMeta) {
      const paramValue = request.params?.[resourceMeta.param];
      if (paramValue) {
        resource = await this.resourceContextReader.load(
          resourceMeta.entityName,
          String(paramValue),
        );
      }
    }

    // ?? Evaluate ???????????????????????????????????????????????????????????
    const action = `${context.getClass().name}.${context.getHandler().name}`;
    const resourceId = getResourceId(resource) ?? request.params?.id;

    const result = await this.policyEngine.evaluate(handlers, {
      user,
      action,
      resource,
      resourceType: resourceMeta?.entityName,
      resourceId,
    });

    // ?? Audit ??????????????????????????????????????????????????????????????
    this.auditService.record(user, action, result, {
      resource: resourceMeta?.entityName,
      resourceId,
    });

    // ?? Deny ???????????????????????????????????????????????????????????????
    if (!result.allowed) {
      const missingPerms = handlers
        .flatMap((h) => h.requiredAnyOfPermissions ?? [])
        .filter((p) => !this.policyEngine.can(user, p));

      throwForbidden(
        "Bạn không có quyền thực hiện hành động này!",
        ERROR_CODES.PERMISSION_DENIED,
        {
          userId: user?.id ?? null,
          resource: resourceMeta?.entityName ?? null,
          resourceId: getResourceId(resource) ?? null,
          policyUsed: result.policyUsed ?? null,
          missingPermissions: missingPerms.length ? missingPerms : undefined,
          reason: ERROR_REASONS.MISSING_PERMISSION,
        },
      );
    }

    return true;
  }

  /**
   * Collect handlers from all three decorator sources and merge them.
   */
  private resolveHandlers(context: ExecutionContext): PolicyHandler[] {
    const handlers: PolicyHandler[] = [];

    // 1. @CheckPolicy ? explicit handler instances
    const checkPolicies = this.reflector.getAllAndOverride<PolicyHandler[]>(
      CHECK_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (checkPolicies?.length) handlers.push(...checkPolicies);

    // 2. @RequirePolicy ? registry lookup
    const requirePolicyMeta =
      this.reflector.getAllAndOverride<RequirePolicyMeta>(REQUIRE_POLICY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    if (requirePolicyMeta) {
      const domain = PolicyRegistry[requirePolicyMeta.domain];
      if (domain) {
        const handler = (domain as Record<string, PolicyHandler>)[
          requirePolicyMeta.action
        ];
        if (handler) handlers.push(handler);
      }
    }

    // 3. @RequirePermission ? synthesize inline handler
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredPermissions?.length) {
      handlers.push({
        policyName: `RequirePermission(${requiredPermissions.join(",")})`,
        requiredAnyOfPermissions: requiredPermissions,
        handle: (user: AuthUser) => {
          return requiredPermissions.every((p) =>
            this.policyEngine.can(user, p),
          );
        },
      });
    }

    return handlers;
  }
}
