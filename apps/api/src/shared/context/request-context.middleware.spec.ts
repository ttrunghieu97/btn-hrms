import { RequestContextMiddleware } from "./request-context.middleware";
import { RequestContextService } from "./request-context.service";

describe(RequestContextMiddleware.name, () => {
  it("sets base request context without authenticating the request", async () => {
    const requestContext = new RequestContextService();
    const middleware = new RequestContextMiddleware(requestContext);

    const next = jest.fn(() => {
      expect(requestContext.get()?.requestId).toBeDefined();
      expect(requestContext.get()?.dbExecutor).toBeUndefined();
      expect(requestContext.get()?.userId).toBeUndefined();
    });

    middleware.use(
      { method: "GET", url: "/x", headers: {} } as any,
      {} as any,
      next,
    );

    expect(next).toHaveBeenCalled();
  });
});
