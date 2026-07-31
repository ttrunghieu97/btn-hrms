import { type Provider } from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
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
  inject: [DATABASE_CLIENT],
  useFactory: (client: postgres.Sql) => drizzle(client, { schema, logger: false }),
};
