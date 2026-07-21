import * as request from "supertest";
import { getApp, getDb, seedAdmin, cleanupUser } from "./helpers/test-app";
import * as schema from "../../src/infrastructure/database/schema";

describe("Auth (e2e)", () => {
  const ctx: { app?: any; db?: typeof schema; admin?: any } = {};

  beforeAll(async () => {
    ctx.app = await getApp();
    ctx.db = await getDb(ctx.app);
    ctx.admin = await seedAdmin(ctx.db);
  });

  afterAll(async () => {
    if (ctx.admin) await cleanupUser(ctx.db!, ctx.admin.username);
  });

  it("POST /auth/login — success with valid credentials", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .post("/auth/login")
      .send({ username: ctx.admin.username, password: ctx.admin.password });
    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
  });

  it("POST /auth/login — 401 with invalid password", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .post("/auth/login")
      .send({ username: ctx.admin.username, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("POST /auth/login — 401 with unknown user", async () => {
    const res = await request(ctx.app!.getHttpServer())
      .post("/auth/login")
      .send({ username: "nonexistent", password: "any" });
    expect(res.status).toBe(401);
  });

  it("POST /auth/refresh — refreshes token", async () => {
    const loginRes = await request(ctx.app!.getHttpServer())
      .post("/auth/login")
      .send({ username: ctx.admin.username, password: ctx.admin.password });
    const accessToken = loginRes.body.data.access_token;

    const res = await request(ctx.app!.getHttpServer())
      .post("/auth/refresh")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
  });
});
