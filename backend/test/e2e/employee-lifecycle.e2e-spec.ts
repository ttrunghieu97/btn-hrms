import { eq } from "drizzle-orm";
import * as request from "supertest";
import { getApp, getDb, seedAdmin, cleanupUser } from "./helpers/test-app";
import * as schema from "../../src/infrastructure/database/schema";

describe("Employee Lifecycle (e2e)", () => {
  const ctx: {
    app?: any; db?: typeof schema;
    admin?: { username: string; password: string };
    token?: string; employeeId?: string;
  } = {};

  beforeAll(async () => {
    ctx.app = await getApp();
    ctx.db = await getDb(ctx.app);
    ctx.admin = await seedAdmin(ctx.db);

    const res = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ username: ctx.admin.username, password: ctx.admin.password });
    ctx.token = res.body.data.access_token;
  });

  afterAll(async () => {
    if (ctx.employeeId && ctx.db) {
      await ctx.db.delete(schema.employees).where(eq(schema.employees.id, ctx.employeeId));
    }
    if (ctx.admin) await cleanupUser(ctx.db!, ctx.admin.username);
  });

  it("POST /employees — hire an employee", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({
        firstName: "E2E", lastName: "TestEmployee",
        email: `e2e-${Date.now()}@test.com`,
        hireDate: "2026-07-19",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    ctx.employeeId = res.body.data.id;
  });

  it("GET /employees/:id — verify employee exists", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .get(`/employees/${ctx.employeeId}`)
      .set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ctx.employeeId);
    expect(res.body.data.firstName).toBe("E2E");
  });

  it("POST /offboarding — start offboarding", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .post("/offboarding")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ employeeId: ctx.employeeId, reason: "E2E test", exitDate: "2026-07-31" });
    expect(res.status).toBe(201);
  });

  it("GET /offboarding?employeeId=:id — verify offboarding created", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .get(`/offboarding?employeeId=${ctx.employeeId}`)
      .set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /employees/:id — verify employee status", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .get(`/employees/${ctx.employeeId}`)
      .set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toMatch(/terminated|offboarding/i);
  });
});
