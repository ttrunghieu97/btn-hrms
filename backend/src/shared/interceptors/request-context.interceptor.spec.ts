import { of, firstValueFrom } from "rxjs";
import { type CallHandler, type ExecutionContext } from "@nestjs/common";
import { RequestContextInterceptor } from "./request-context.interceptor";
import { RequestContextService } from "../context/request-context.service";

describe(RequestContextInterceptor.name, () => {
  it("captures authenticated user identity from the live request inside ALS", async () => {
    const requestContext = new RequestContextService();
    const interceptor = new RequestContextInterceptor(requestContext);

    const req: any = {
      headers: { "x-request-id": "req-1", "user-agent": "jest" },
      ip: "127.0.0.1",
      method: "GET",
      originalUrl: "/users/me",
      url: "/users/me",
      user: {
        id: "user-1",
        username: "alice",
        employeeId: null,
        scopeId: null,
        departmentId: null,
        permissions: ["users:view:self"],
        roles: ["admin"],
        isSuperAdmin: false,
      },
    };
    const res: any = {
      headersSent: false,
      getHeader: jest.fn().mockReturnValue(undefined),
      setHeader: jest.fn(),
    };

    const executionContext = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as ExecutionContext;

    let seenContext: ReturnType<RequestContextService["get"]>;
    const next: CallHandler = {
      handle: () => {
        seenContext = requestContext.get();
        return of({ ok: true });
      },
    };

    await firstValueFrom(interceptor.intercept(executionContext, next));

    expect(seenContext).toMatchObject({
      requestId: "req-1",
      userId: "user-1",
      username: "alice",
      roles: ["admin"],
      permissions: ["users:view:self"],
    });
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", "req-1");
  });
});
