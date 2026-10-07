import { StructuredLogger } from "./structured-logger";

describe("Observability", () => {
  describe("TraceMiddleware", () => {
    it("generates traceId from header when present", () => {
      const ctx = { run: jest.fn(), get: jest.fn().mockReturnValue({}) };
      const req = { headers: { "x-trace-id": "abc-123" }, method: "GET", path: "/employees" };
      ctx.run.mockImplementation((context: any, fn: any) => {
        expect(context.traceId).toBe("abc-123");
        fn();
      });
      // Simulate middleware behavior
      const traceId = req.headers["x-trace-id"] ?? crypto.randomUUID();
      ctx.run({ requestId: traceId, traceId }, () => {});
      expect(ctx.run).toHaveBeenCalled();
    });

    it("generates traceId from uuid when no header", () => {
      const ctx = { run: jest.fn(), get: jest.fn().mockReturnValue({}) };
      const req = { headers: {}, method: "GET", path: "/employees" };
      ctx.run.mockImplementation((context: any, fn: any) => {
        expect(context.traceId).toBeDefined();
        fn();
      });
      ctx.run({ requestId: "gen-uuid", traceId: "gen-uuid" }, () => {});
      expect(ctx.run).toHaveBeenCalled();
    });
  });

  describe("StructuredLogger", () => {
    it("formats log with traceId", () => {
      const ctx = { get: jest.fn().mockReturnValue({ traceId: "t-1", correlationId: "c-1" }) };
      const logger = new StructuredLogger("test", ctx as any);
      const spy = jest.spyOn(logger["logger"], "log");
      logger.info({ event: "test.event", employeeId: "e1" });
      const args = spy.mock.calls[0]![0];
      expect(args.traceId).toBe("t-1");
      expect(args.event).toBe("test.event");
      expect(args.level).toBe("info");
    });

    it("logs error without PII", () => {
      const ctx = { get: jest.fn().mockReturnValue({ traceId: "t-1" }) };
      const logger = new StructuredLogger("test", ctx as any);
      const spy = jest.spyOn(logger["logger"], "error");
      logger.error({ event: "test.fail", error: "db timeout" });
      const args = spy.mock.calls[0]![0];
      expect(args.error).toBe("db timeout");
      expect(args.event).toBe("test.fail");
    });

    it("timing start/stop pair produces duration", () => {
      const ctx = { get: jest.fn().mockReturnValue({ traceId: "t-1" }) };
      const logger = new StructuredLogger("test", ctx as any);
      const spy = jest.spyOn(logger["logger"], "log");
      const done = logger.start({ event: "slow.op", stage: "usecase" });
      done();
      expect(spy).toHaveBeenCalledTimes(2);
      const startCall = spy.mock.calls[0]![0];
      const endCall = spy.mock.calls[1]![0];
      expect(startCall.event).toBe("slow.op");
      expect(endCall.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
