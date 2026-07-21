import { BadRequestException } from "@nestjs/common";
import { RequestContextService } from "./request-context.service";

describe("RequestContextService", () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  it("returns scopeId from request context", () => {
    const scopeId = service.run(
      { requestId: "req-1", scopeId: "scope-1", startTime: Date.now() },
      () => service.getScopeIdOrThrow(),
    );

    expect(scopeId).toBe("scope-1");
  });

  it("accepts an explicit scopeId that matches the request context", () => {
    const scopeId = service.run(
      { requestId: "req-1", scopeId: "scope-1", startTime: Date.now() },
      () => service.getScopeIdOrThrow("scope-1"),
    );

    expect(scopeId).toBe("scope-1");
  });

  it("rejects explicit scopeIds that do not match the request context", () => {
    expect(() =>
      service.run(
        { requestId: "req-1", scopeId: "scope-1", startTime: Date.now() },
        () => service.getScopeIdOrThrow("scope-2"),
      ),
    ).toThrow(BadRequestException);
  });
});
