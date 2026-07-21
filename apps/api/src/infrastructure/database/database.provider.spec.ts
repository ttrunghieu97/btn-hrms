import { Logger } from "@nestjs/common";
import { RequestContextService } from "../../shared/context/request-context.service";

const fakeDb = {
  query: {
    departments: {
      findMany: jest.fn().mockReturnValue([1, 2, 3]),
    },
  },
};

jest.mock("drizzle-orm/postgres-js", () => ({
  drizzle: jest.fn(() => fakeDb),
}));

import { databaseProvider } from "./database.provider";

describe("databaseProvider diagnostic logging", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    fakeDb.query.departments.findMany.mockClear();
  });

  it("does not log transaction propagation loss for normal request-scoped reads", () => {
    const requestContext = new RequestContextService();
    const errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();

    const provider = databaseProvider as {
      useFactory: (client: unknown, requestContext: RequestContextService) => typeof fakeDb;
    };

    const db = provider.useFactory({}, requestContext);

    requestContext.run(
      {
        requestId: "req-1",
        startTime: Date.now(),
        method: "GET",
        path: "/api/v1/departments",
      },
      () => {
        db.query.departments.findMany();
      },
    );

    expect(fakeDb.query.departments.findMany).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
