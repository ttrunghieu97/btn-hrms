import { Test, TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { AppModule } from "../../../src/app/app.module";
import { DATABASE_CONNECTION } from "../../../src/infrastructure/database/database.provider";
import * as schema from "../../../src/infrastructure/database/schema";

let _app: INestApplication | null = null;

export async function getApp(): Promise<INestApplication> {
  if (_app) return _app;
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  _app = moduleFixture.createNestApplication();
  await _app.init();
  return _app;
}

export async function closeApp(): Promise<void> {
  if (_app) { await _app.close(); _app = null; }
}

export async function getDb(app: INestApplication): Promise<typeof schema> {
  return app.get(DATABASE_CONNECTION);
}

export async function seedAdmin(db: typeof schema): Promise<{
  username: string; password: string; userId: string; employeeId: string;
}> {
  const nonce = randomUUID().replace(/-/g, "").substring(0, 8);
  const username = `admin-${Date.now()}-${nonce}`;
  const password = "E2eTest@2026!";
  const userId = uuid();
  const employeeId = uuid();
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(schema.users).values({
    id: userId, username, passwordHash,
    isSuperAdmin: true, isActive: true, authorizationVersion: 1,
  });
  await db.insert(schema.employees).values({
    id: employeeId,
    userId,
    firstName: "Admin",
    lastName: "User",
    employeeCode: `EMP-ADM-${nonce}`,
    status: "working",
  });
  return { username, password, userId, employeeId };
}

export async function seedRegularUser(db: typeof schema): Promise<{
  username: string; password: string; userId: string; employeeId: string;
}> {
  const nonce = randomUUID().replace(/-/g, "").substring(0, 8);
  const username = `user-${Date.now()}-${nonce}`;
  const password = "E2eTest@2026!";
  const userId = uuid();
  const employeeId = uuid();
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(schema.users).values({
    id: userId, username, passwordHash,
    isSuperAdmin: false, isActive: true, authorizationVersion: 1,
  });
  await db.insert(schema.employees).values({
    id: employeeId,
    userId,
    firstName: "Regular",
    lastName: "User",
    employeeCode: `EMP-REG-${nonce}`,
    status: "working",
  });
  return { username, password, userId, employeeId };
}

export async function cleanupUser(
  db: typeof schema, username: string
): Promise<void> {
  await db.delete(schema.users).where(eq(schema.users.username, username));
}
