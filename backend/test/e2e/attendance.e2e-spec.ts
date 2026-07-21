import * as request from "supertest";
import { eq } from "drizzle-orm";
import { getApp, getDb, seedAdmin, cleanupUser } from "./helpers/test-app";
import * as schema from "../../src/infrastructure/database/schema";

describe("Attendance (e2e)", () => {
  const ctx: {
    app?: any; db?: typeof schema;
    admin?: any; token?: string;
    employeeId?: string;
  } = {};

  beforeAll(async () => {
    ctx.app = await getApp();
    ctx.db = await getDb(ctx.app);
    ctx.admin = await seedAdmin(ctx.db);

    const res = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ username: ctx.admin.username, password: ctx.admin.password });
    ctx.token = res.body.data.access_token;

    // Create a test employee
    const hireRes = await request(ctx.app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ firstName: "Att", lastName: "Test", email: `att-${Date.now()}@test.com`, hireDate: "2026-07-19" });
    ctx.employeeId = hireRes.body.data.id;
  });

  afterAll(async () => {
    if (ctx.employeeId && ctx.db) {
      await ctx.db.delete(schema.employees).where(eq(schema.employees.id, ctx.employeeId));
    }
    if (ctx.admin) await cleanupUser(ctx.db!, ctx.admin.username);
  });

  it("POST /attendances/check — check in", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .post("/attendances/check")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ date: "2026-07-19", session: "morning", type: "checkin" });
    expect(res.status).toBe(201);
  });

  it("POST /attendances/check — check out", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .post("/attendances/check")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ date: "2026-07-19", session: "morning", type: "checkout" });
    expect(res.status).toBe(201);
  });
});
