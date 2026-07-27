import { v4 as uuid } from "uuid";
import request from "supertest";
import { eq } from "drizzle-orm";
import { getApp, getDb, seedAdmin, cleanupUser } from "./helpers/test-app";
import * as schema from "../../src/infrastructure/database/schema";

describe("Leave (e2e)", () => {
  const ctx: {
    app?: any; db?: typeof schema;
    admin?: any; token?: string;
    employeeId?: string; leaveId?: string; leaveTypeId?: string;
  } = {};

  beforeAll(async () => {
    ctx.app = await getApp();
    ctx.db = await getDb(ctx.app);
    ctx.admin = await seedAdmin(ctx.db);

    const res = await request(ctx.app.getHttpServer())
      .post("/auth/login")
      .send({ username: ctx.admin.username, password: ctx.admin.password });
    ctx.token = res.body.data.access_token;

    // Seed a leave type
    ctx.leaveTypeId = uuid();
    await ctx.db.insert(schema.leaveTypes).values({
      id: ctx.leaveTypeId,
      code: `ANNUAL-${Date.now()}`,
      name: "Annual Leave",
      isPaid: true,
      requiresApproval: false,
    });

    // Create test employee
    const hireRes = await request(ctx.app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({
        firstName: "Leave", lastName: "Test",
        employeeCode: `EMP-LV-${Date.now()}`,
        email: `leave-${Date.now()}@test.com`,
        startDate: "2026-07-01",
      });
    ctx.employeeId = hireRes.body.data.id;
  });

  afterAll(async () => {
    if (ctx.leaveId && ctx.db) {
      await ctx.db.delete(schema.leaveRequests).where(eq(schema.leaveRequests.id, ctx.leaveId));
    }
    if (ctx.employeeId && ctx.db) {
      await ctx.db.delete(schema.employees).where(eq(schema.employees.id, ctx.employeeId));
    }
    if (ctx.leaveTypeId && ctx.db) {
      await ctx.db.delete(schema.leaveTypes).where(eq(schema.leaveTypes.id, ctx.leaveTypeId));
    }
    if (ctx.admin) await cleanupUser(ctx.db!, ctx.admin.username);
  });

  it("POST /leave/management — create leave request", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .post("/leave/management")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({
        employeeId: ctx.employeeId,
        leaveTypeId: ctx.leaveTypeId,
        startDate: "2026-07-20",
        endDate: "2026-07-21",
        startSession: "full_day",
        endSession: "full_day",
        totalUnits: "2",
        reason: "E2E test leave",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    ctx.leaveId = res.body.data.id;
  });

  it("GET /leave/management/:id — verify leave status", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .get(`/leave/management/${ctx.leaveId}`)
      .set("Authorization", `Bearer ${ctx.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toMatch(/pending|submitted|approved/i);
  });
});
