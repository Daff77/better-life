import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../index.js";

describe("Backend Activity API Integration", () => {
  let authToken = "";

  before(async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: `activity-${Date.now()}@example.com`,
        phone: "08129876543",
        password: "Password123!",
        name: "Activity Tester",
      });
    assert.equal(res.status, 201);
    authToken = res.body.token;
  });

  it("GET /api/activity — should reject unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/activity");
    assert.equal(res.status, 401);
  });

  it("GET /api/activity — should return default activity stats when authenticated", async () => {
    const res = await request(app)
      .get("/api/activity")
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(typeof res.body.steps === "number");
    assert.ok(typeof res.body.stepGoal === "number");
    assert.ok(typeof res.body.exerciseCalories === "number");
  });

  it("POST /api/activity/steps — should reject invalid step input with 400", async () => {
    const res = await request(app)
      .post("/api/activity/steps")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ steps: -100 });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Validation Error");
  });

  it("POST /api/activity/steps — should increment steps and calculate exercise metrics", async () => {
    const res = await request(app)
      .post("/api/activity/steps")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ steps: 2000 });

    assert.equal(res.status, 200);
    assert.ok(res.body.steps >= 2000);
    assert.equal(res.body.exerciseCalories, Math.round(res.body.steps * 0.04));
    assert.equal(res.body.exerciseDurationMinutes, Math.round(res.body.steps / 100));
  });
});
