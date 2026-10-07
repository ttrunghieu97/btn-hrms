import { Inject, Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { RequestContextService } from "../../shared/context/request-context.service";
import { DATABASE_CONNECTION } from "./database.provider";

@Injectable()
export class ScopedDbService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<any>,
    private readonly requestContext: RequestContextService,
  ) {}

  getDb<T extends Record<string, unknown> = Record<string, unknown>>(): PostgresJsDatabase<T> {
    return this.db as PostgresJsDatabase<T>;
  }

  getScopeId(explicitScopeId?: string | null): string | null {
    return this.requestContext.getScopeId(explicitScopeId);
  }

  getScopeIdOrThrow(explicitScopeId?: string | null): string {
    return this.requestContext.getScopeIdOrThrow(explicitScopeId);
  }
}

