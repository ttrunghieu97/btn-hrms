import { HttpStatus } from "@nestjs/common";
import { AllExceptionsFilter } from "./all-exceptions.filter";
import { captureException } from "../observability/sentry";

jest.mock("../observability/sentry", () => ({
  captureException: jest.fn(),
}));

describe("AllExceptionsFilter Database Error Mapping", () => {
  let filter: AllExceptionsFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockRequestContext = {
      get: jest.fn().mockReturnValue({ requestId: "test-req-123" }),
    };
    filter = new AllExceptionsFilter(mockRequestContext as any);

    mockResponse = {
      headersSent: false,
      getHeader: jest.fn().mockReturnValue(null),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      id: "req-1",
      headers: {},
      url: "/test",
      method: "GET",
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it("maps Postgres connection drop (08006) to 503 and reports to Sentry", () => {
    const dbError = new Error("connection lost");
    (dbError as any).code = "08006";

    filter.catch(dbError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: "SERVICE_UNAVAILABLE",
          message: "Database connection unavailable",
        }),
      }),
    );
    expect(captureException).toHaveBeenCalledWith(dbError, expect.anything());
  });

  it("maps Postgres disk full (53100) to 503 and reports to Sentry", () => {
    const dbError = new Error("disk full");
    (dbError as any).code = "53100";

    filter.catch(dbError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(captureException).toHaveBeenCalledWith(dbError, expect.anything());
  });

  it("maps Postgres deadlock (40P01) to 409 conflict", () => {
    const dbError = new Error("deadlock detected");
    (dbError as any).code = "40P01";

    filter.catch(dbError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  it("maps Postgres unique constraint violation (23505) to 409 conflict", () => {
    const dbError = new Error("duplicate key");
    (dbError as any).code = "23505";
    (dbError as any).detail = "Key (user_id)=(123) already exists.";

    filter.catch(dbError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  it("maps unhandled internal Postgres error to 500 and reports to Sentry", () => {
    const dbError = new Error("internal crash");
    (dbError as any).code = "XX000";

    filter.catch(dbError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(captureException).toHaveBeenCalledWith(dbError, expect.anything());
  });
});
