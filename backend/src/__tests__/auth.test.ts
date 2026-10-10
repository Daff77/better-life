import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../index.js";

describe("Backend Authentication API Integration", () => {
  const uniqueEmail = `test.user.${Date.now()}@betterlife.test`;
  let authToken = "";

  it("POST /api/auth/register — should successfully register a new user and return a JWT token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test Engineer",
        email: uniqueEmail,
        phone: "+62 812-9988-7766",
        password: "securePassword123!",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, uniqueEmail);
    assert.equal(res.body.user.name, "Test Engineer");
    assert.ok(res.body.token, "Expected a signed JWT token");
    assert.ok(res.body.token.split(".").length === 3, "Token must be a valid 3-part JWT");
  });

  it("POST /api/auth/register — should reject duplicate registration with 409 Conflict", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Duplicate User",
        email: uniqueEmail,
        phone: "+62 812-9988-7766",
        password: "anotherPassword123!",
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, "Conflict");
  });

  it("POST /api/auth/login — should authenticate with valid credentials and return JWT", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: uniqueEmail,
        password: "securePassword123!",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, uniqueEmail);
    assert.ok(res.body.token);
    authToken = res.body.token;
  });

  it("POST /api/auth/login — should reject login with invalid password (401 Unauthorized)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: uniqueEmail,
        password: "wrongPassword!",
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Unauthorized");
  });

  it("GET /api/auth/me — should return authenticated user profile when Bearer token is provided", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, uniqueEmail);
  });

  it("GET /api/auth/me — should reject access without token (401 Unauthorized)", async () => {
    const res = await request(app).get("/api/auth/me");

    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Unauthorized");
  });

  it("GET /api/auth/me — should reject access with invalid token (401 Unauthorized)", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.jwt.token");

    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Unauthorized");
  });
});
