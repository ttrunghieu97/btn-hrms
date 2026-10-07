import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { IAuthSessionReader } from "../../../contracts/ports/auth-session-reader.port";
import { IPermissionReader } from "../../../contracts/ports/permission-reader.port";
import { RolesRepository } from "../../../modules/identity/roles/roles.repository";
import { PermissionHierarchyResolver } from "../permissions/permission-hierarchy.resolver";

describe("JwtAuthGuard — Authorization Version & Revocation", () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;
  let authSessionReader: jest.Mocked<IAuthSessionReader>;
  let permissionReader: jest.Mocked<IPermissionReader>;
  let rolesRepo: jest.Mocked<RolesRepository>;
  let hierarchyResolver: jest.Mocked<PermissionHierarchyResolver>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as any;

    authSessionReader = {
      loadAuthSession: jest.fn(),
      isAuthUserActive: jest.fn().mockResolvedValue(true),
    } as any;

    permissionReader = {
      getPermissions: jest.fn().mockResolvedValue([]),
    } as any;

    rolesRepo = {
      findRoleContextByUserId: jest.fn().mockResolvedValue({ roleNames: ["employee"], permissions: [] }),
    } as any;

    hierarchyResolver = {
      expand: jest.fn().mockImplementation((perms) => perms),
    } as any;

    guard = new JwtAuthGuard(
      jwtService,
      permissionReader,
      authSessionReader,
      configService,
      reflector,
      rolesRepo as any,
      hierarchyResolver as any,
    );
  });

  function createMockContext(token = "valid.jwt.token"): ExecutionContext {
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  it("accepts token when token.azv matches dbUser.authorizationVersion", async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: "u-1", azv: 3 });
    authSessionReader.loadAuthSession.mockResolvedValue({
      user: {
        id: "u-1",
        username: "user1",
        isSuperAdmin: false,
        isActive: true,
        authorizationVersion: 3,
      },
      employee: null,
    });

    const ctx = createMockContext();
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it("rejects token when token.azv is less than dbUser.authorizationVersion (revoked / bumped)", async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: "u-1", azv: 1 });
    authSessionReader.loadAuthSession.mockResolvedValue({
      user: {
        id: "u-1",
        username: "user1",
        isSuperAdmin: false,
        isActive: true,
        authorizationVersion: 2,
      },
      employee: null,
    });

    const ctx = createMockContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects token when user is deactivated / inactive", async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: "u-1", azv: 1 });
    authSessionReader.loadAuthSession.mockResolvedValue({
      user: {
        id: "u-1",
        username: "user1",
        isSuperAdmin: false,
        isActive: false,
        authorizationVersion: 1,
      },
      employee: null,
    });
    authSessionReader.isAuthUserActive.mockResolvedValue(false);

    const ctx = createMockContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
