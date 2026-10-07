import { ContextLogger } from "./context-logger";
import { StructuredLogger } from "../observability/structured-logger";
import { RequestContextService } from "../context/request-context.service";
import { Logger } from "@nestjs/common";

describe("Logger Redaction Suite", () => {
  let ctxService: RequestContextService;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    ctxService = new RequestContextService();
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("ContextLogger", () => {
    it("redacts sensitive fields like password, token, and bankAccountNumber", () => {
      const logger = new ContextLogger(ctxService, "TestContext");

      logger.log({
        message: "User login attempt",
        password: "SuperSecretPassword123",
        token: "jwt-secret-token",
        bankAccountNumber: "1234567890",
        taxCode: "TAX-9999",
        safeField: "safe-value",
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(logSpy.mock.calls[0][0]);
      expect(loggedJson.message).toBe("User login attempt");
      expect(loggedJson.password).toBe("[REDACTED]");
      expect(loggedJson.token).toBe("[REDACTED]");
      expect(loggedJson.bankAccountNumber).toBe("[REDACTED]");
      expect(loggedJson.taxCode).toBe("[REDACTED]");
      expect(loggedJson.safeField).toBe("safe-value");
    });
  });

  describe("StructuredLogger", () => {
    it("redacts sensitive fields in info, warn, and error calls", () => {
      const logger = new StructuredLogger("StructuredTestContext", ctxService);

      logger.info({
        event: "employee.created",
        personalEmail: "private@domain.com",
        identityNumber: "ID-123456",
        safeMeta: "all-good",
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const loggedObj = logSpy.mock.calls[0][0];
      expect(loggedObj.event).toBe("employee.created");
      expect(loggedObj.personalEmail).toBe("[REDACTED]");
      expect(loggedObj.identityNumber).toBe("[REDACTED]");
      expect(loggedObj.safeMeta).toBe("all-good");

      logger.error({
        event: "auth.failed",
        error: "Invalid credentials",
        password: "BadPassword",
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const errorObj = errorSpy.mock.calls[0][0];
      expect(errorObj.password).toBe("[REDACTED]");
    });
  });
});
