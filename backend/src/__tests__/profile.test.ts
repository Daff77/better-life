import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../index.js";

describe("Backend Profile API Integration", () => {
  let authToken = "";

  before(async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: `profile-${Date.now()}@example.com`,
        phone: "081122334455",
        password: "Password123!",
        name: "Profile Tester",
      });
    assert.equal(res.status, 201);
    authToken = res.body.token;
  });

  it("GET /api/profile/me — should reject unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/profile/me");
    assert.equal(res.status, 401);
  });

  it("GET /api/profile/me — should return user info and null profile if not set yet", async () => {
    const res = await request(app)
      .get("/api/profile/me")
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, "Profile Tester");
    assert.equal(res.body.profile, null);
  });

  it("PUT /api/profile/personalization — should validate required fields and reject invalid data with 400", async () => {
    const res = await request(app)
      .put("/api/profile/personalization")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        goal: "Invalid Goal",
        weight: 15, // below minimum 30
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Validation Error");
  });

  it("PUT /api/profile/personalization — should save valid personalization data", async () => {
    const validData = {
      goal: "Lose weight",
      weight: 75,
      height: 175,
      gender: "Male",
      birthDate: {
        day: 15,
        month: "05",
        year: 1995,
      },
      cookingSkill: "Middle",
      dietType: "High Protein",
      allergies: ["Peanuts"],
      targetCalories: 2150,
    };

    const res = await request(app)
      .put("/api/profile/personalization")
      .set("Authorization", `Bearer ${authToken}`)
      .send(validData);

    assert.equal(res.status, 200);
    assert.equal(res.body.profile.goal, "Lose weight");
    assert.equal(res.body.profile.targetCalories, 2150);
    assert.equal(res.body.profile.onboardingCompleted, true);

    // Verify GET /api/profile/me now returns the saved profile
    const getRes = await request(app)
      .get("/api/profile/me")
      .set("Authorization", `Bearer ${authToken}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.profile.targetCalories, 2150);
  });
});
