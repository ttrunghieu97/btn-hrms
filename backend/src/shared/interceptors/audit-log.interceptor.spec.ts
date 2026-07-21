import { of, throwError } from "rxjs";
import { type Reflector } from "@nestjs/core";
import { AuditLogInterceptor } from "./audit-log.interceptor";
import { RequestContextService } from "../context/request-context.service";

describe(AuditLogInterceptor.name, () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const createAuditLog = { write: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue({ id: "a1" }),
  };

  const requestContext = new RequestContextService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createContext() {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: "u1" },
          body: { password: "secret" },
          params: { id: "123" },
          query: { q: "x" },
        }),
      }),
    } as any;
  }

  it("writes audit logs on successful decorated requests", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue({
      action: "employee_update",
      entity: "employee",
    });

    const interceptor = new AuditLogInterceptor(
      reflector,
      createAuditLog,
      requestContext,
    );

    await new Promise<void>((resolve, reject) => {
      interceptor.intercept(createContext(), {
        handle: () => of({ id: "123", ok: true }),
      } as any).subscribe({
        next: () => undefined,
        error: reject,
        complete: resolve,
      });
    });

    await Promise.resolve();

    expect(createAuditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "u1",
        action: "employee_update",
        entity: "employee",
      }),
    );
  });

  it("writes failure-path audit logs without swallowing the original error", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue({
      action: "employee_update",
      entity: "employee",
    });

    const interceptor = new AuditLogInterceptor(
      reflector,
      createAuditLog,
      requestContext,
    );

    await expect(
      new Promise<void>((resolve, reject) => {
        interceptor.intercept(createContext(), {
          handle: () => throwError(() => new Error("boom")),
        } as any).subscribe({
          next: () => undefined,
          error: reject,
          complete: resolve,
        });
      }),
    ).rejects.toThrow("boom");

    await Promise.resolve();

    expect(createAuditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "u1",
        action: "employee_update",
        entity: "employee",
        metadata: expect.objectContaining({ success: false }),
      }),
    );
  });

  it("never fails the request when audit writing fails", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue({
      action: "employee_update",
      entity: "employee",
    });
    createAuditLog.write.mockRejectedValueOnce(new Error("audit down"));

    const interceptor = new AuditLogInterceptor(
      reflector,
      createAuditLog,
      requestContext,
    );

    await new Promise<void>((resolve, reject) => {
      interceptor.intercept(createContext(), {
        handle: () => of({ id: "123", ok: true }),
      } as any).subscribe({
        next: () => undefined,
        error: reject,
        complete: resolve,
      });
    });
  });
});
