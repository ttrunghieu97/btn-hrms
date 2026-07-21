import { AppDatabase, AppTransaction } from "../../../../infrastructure/database/database-client.type";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
@Injectable()
export class TasksTransactionsRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }
  transaction<T>(handler: (tx: AppTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(handler);
  }
}
