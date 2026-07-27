import request from "supertest";
import { eq } from "drizzle-orm";
import { getApp, getDb, seedAdmin, seedRegularUser, cleanupUser } from "./helpers/test-app";
import * as schema from "../../src/infrastructure/database/schema";

describe("Authorization (e2e)", () => {
  const ctx: {
    app?: any; db?: typeof schema;
    admin?: any; regularUser?: any;
    adminToken?: string; regularToken?: string;
    employeeId?: string;
  } = {};

  beforeAll(async () => {
    ctx.app = await getApp();
    ctx.db = await getDb(ctx.app);

    ctx.admin = await seedAdmin(ctx.db);
    ctx.regularUser = await seedRegularUser(ctx.db);

    const adminRes = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ username: ctx.admin.username, password: ctx.admin.password });
    ctx.adminToken = adminRes.body.data.access_token;

    const userRes = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ username: ctx.regularUser.username, password: ctx.regularUser.password });
    ctx.regularToken = userRes.body.data.access_token;
  });

  afterAll(async () => {
    if (ctx.employeeId && ctx.db) {
      await ctx.db.delete(schema.employees).where(eq(schema.employees.id, ctx.employeeId));
    }
    if (ctx.admin) await cleanupUser(ctx.db!, ctx.admin.username);
    if (ctx.regularUser) await cleanupUser(ctx.db!, ctx.regularUser.username);
  });

  it("GET /admin-only — 403 for non-admin user", async () => {
    // Try accessing an admin-only endpoint with regular user token
    const res = await request(ctx.app!.getHttpServer())
      .get("/users")
      .set("Authorization", `Bearer ${ctx.regularToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /employees — 401 without token", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .get("/employees/any-id");
    expect(res.status).toBe(401);
  });

  it("PUT /employees/:id/terminate — 403 for non-admin trying to terminate", async () => {
    // Need an employee first — create via admin
    const hireRes = await request(ctx.app!.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ctx.adminToken}`)
      .send({
        firstName: "AuthZ", lastName: "Test",
        employeeCode: `EMP-AZ-${Date.now()}`,
        email: `authz-${Date.now()}@test.com`,
        startDate: "2026-07-19",
      });
    ctx.employeeId = hireRes.body.data.id;

    // Regular user tries to terminate employee
    const res = await request(ctx.app!.getHttpServer())
      .put(`/employees/${ctx.employeeId}/terminate`)
      .set("Authorization", `Bearer ${ctx.regularToken}`)
      .send({ terminationDate: "2026-07-31", reason: "should fail" });
    expect(res.status).toBe(403);
  });
});
