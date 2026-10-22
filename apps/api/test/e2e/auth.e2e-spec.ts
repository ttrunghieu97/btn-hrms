import request from "supertest";
import { getApp, getDb, seedAdmin, cleanupUser, type E2eDatabase } from "./helpers/test-app";

describe("Auth (e2e)", () => {
  const ctx: { app?: any; db?: E2eDatabase; admin?: any } = {};

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
    const refreshToken = loginRes.body.data.refresh_token;
    const rawCookie = loginRes.headers["set-cookie"];
    const refreshCookie: string[] = Array.isArray(rawCookie)
      ? rawCookie
      : rawCookie
        ? [rawCookie]
        : [];

    const res = await request(ctx.app!.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", refreshCookie)
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
  });
});
