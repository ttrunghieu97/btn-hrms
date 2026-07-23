import { type Provider, Logger } from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { RequestContextService } from "../../shared/context/request-context.service";
import { DATABASE_CLIENT, DATABASE_CONNECTION } from "./database.tokens";

export { DATABASE_CONNECTION, DATABASE_CLIENT } from "./database.tokens";

export const databaseClientProvider: Provider = {
  provide: DATABASE_CLIENT,
  useFactory: () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not defined in environment variables");
    }

    return postgres(connectionString, {
      prepare: false,
      max: 10,
      idle_timeout: 300,
      connect_timeout: 10,
      keep_alive: 60,
    });
  },
};

export const databaseProvider: Provider = {
  provide: DATABASE_CONNECTION,
  inject: [DATABASE_CLIENT, RequestContextService],
  useFactory: (client: postgres.Sql, requestContext: RequestContextService) => {
    const logger = new Logger("DatabaseProvider");
    const db = drizzle(client, { schema, logger: false });

    return new Proxy(db, {
      get(target, prop, receiver) {
        const context = requestContext.get();
        const executor = (context?.dbExecutor as typeof db | undefined) ?? target;

        if (context?.dbExecutor && executor === target && context?.requestId) {
          logger.error({
            event: "database.proxy.fallback",
            message: "Falling back to raw DB connection after transaction executor was expected.",
            requestId: context.requestId,
            stack: new Error().stack?.split("\n").slice(1, 4).join(" | "),
          });
        }

        const value = Reflect.get(executor, prop, receiver);
        return typeof value === "function" ? value.bind(executor) : value;
      },
    });
  },
};
