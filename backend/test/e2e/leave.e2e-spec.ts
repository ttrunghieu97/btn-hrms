import * as request from "supertest";
import { eq } from "drizzle-orm";
import { getApp, getDb, seedAdmin, cleanupUser } from "./helpers/test-app";
import * as schema from "../../src/infrastructure/database/schema";

describe("Leave (e2e)", () => {
  const ctx: {
    app?: any; db?: typeof schema;
    admin?: any; token?: string;
    employeeId?: string; leaveId?: string;
  } = {};

  beforeAll(async () => {
    ctx.app = await getApp();
    ctx.db = await getDb(ctx.app);
    ctx.admin = await seedAdmin(ctx.db);

    const res = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ username: ctx.admin.username, password: ctx.admin.password });
    ctx.token = res.body.data.access_token;

    // Create test employee
    const hireRes = await request(ctx.app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ firstName: "Leave", lastName: "Test", email: `leave-${Date.now()}@test.com`, hireDate: "2026-07-01" });
    ctx.employeeId = hireRes.body.data.id;
  });

  afterAll(async () => {
    if (ctx.employeeId && ctx.db) {
      await ctx.db.delete(schema.employees).where(eq(schema.employees.id, ctx.employeeId));
    }
    if (ctx.admin) await cleanupUser(ctx.db!, ctx.admin.username);
  });

  it("POST /leave/requests — create leave request", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .post("/leave/requests")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({
        employeeId: ctx.employeeId,
        leaveType: "annual",
        startDate: "2026-08-01", endDate: "2026-08-03",
        reason: "E2E test leave",
      });
    expect(res.status).toBe(201);
    ctx.leaveId = res.body.data.id;
  });

  it("GET /leave/requests/:id — verify leave status", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .get(`/leave/requests/${ctx.leaveId}`)
      .set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toMatch(/pending|submitted/i);
  });
});
