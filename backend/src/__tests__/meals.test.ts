import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../index.js";

describe("Backend Meals API Integration", () => {
  let userAToken = "";
  let userBToken = "";

  before(async () => {
    // Register User A
    const resA = await request(app)
      .post("/api/auth/register")
      .send({
        email: `usera-${Date.now()}@example.com`,
        phone: "08123456789",
        password: "Password123!",
        name: "User A",
      });
    assert.equal(resA.status, 201);
    userAToken = resA.body.token;

    // Register User B
    const resB = await request(app)
      .post("/api/auth/register")
      .send({
        email: `userb-${Date.now()}@example.com`,
        phone: "08123456780",
        password: "Password123!",
        name: "User B",
      });
    assert.equal(resB.status, 201);
    userBToken = resB.body.token;
  });

  it("GET /api/meals — should reject unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/meals");
    assert.equal(res.status, 401);
    assert.ok(res.body.error);
  });

  it("POST /api/meals — should reject unauthenticated requests with 401", async () => {
    const res = await request(app)
      .post("/api/meals")
      .send({
        type: "breakfast",
        name: "Oatmeal Bowl",
        calories: 350,
      });
    assert.equal(res.status, 401);
  });

  it("POST /api/meals — should reject invalid payloads with 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        type: "invalid_meal_type",
        name: "",
        calories: -50,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Validation Error");
    assert.ok(res.body.details);
  });

  let createdMealId = "";

  it("POST /api/meals — should log a meal with macronutrient details for authenticated user", async () => {
    const res = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        type: "Lunch",
        name: "Grilled Chicken & Brown Rice",
        calories: 520,
        proteinGrams: 45,
        carbsGrams: 55,
        fatGrams: 12,
        fiberGrams: 6,
        quantity: 1,
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.name, "Grilled Chicken & Brown Rice");
    assert.equal(res.body.calories, 520);
    assert.equal(res.body.proteinGrams, 45);
    assert.equal(res.body.carbsGrams, 55);
    assert.equal(res.body.fatGrams, 12);
    assert.equal(res.body.fiberGrams, 6);
    assert.equal(res.body.quantity, 1);
    assert.ok(res.body.time);

    createdMealId = res.body.id;
  });

  it("GET /api/meals — should retrieve meals isolated to authenticated user", async () => {
    // User A should have the meal
    const resA = await request(app)
      .get("/api/meals")
      .set("Authorization", `Bearer ${userAToken}`);

    assert.equal(resA.status, 200);
    assert.ok(Array.isArray(resA.body));
    assert.ok(resA.body.some((m: { id: string }) => m.id === createdMealId));

    // User B should NOT have User A's meal
    const resB = await request(app)
      .get("/api/meals")
      .set("Authorization", `Bearer ${userBToken}`);

    assert.equal(resB.status, 200);
    assert.ok(Array.isArray(resB.body));
    assert.ok(!resB.body.some((m: { id: string }) => m.id === createdMealId));
  });

  it("DELETE /api/meals/:id — should prevent IDOR and reject deleting another user's meal", async () => {
    const res = await request(app)
      .delete(`/api/meals/${createdMealId}`)
      .set("Authorization", `Bearer ${userBToken}`);

    assert.equal(res.status, 404);
  });

  it("DELETE /api/meals/:id — should allow owner to delete their own meal", async () => {
    const res = await request(app)
      .delete(`/api/meals/${createdMealId}`)
      .set("Authorization", `Bearer ${userAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.message, "Meal deleted successfully");

    // Verify it is gone
    const verifyRes = await request(app)
      .get("/api/meals")
      .set("Authorization", `Bearer ${userAToken}`);

    assert.ok(!verifyRes.body.some((m: { id: string }) => m.id === createdMealId));
  });

  it("POST /api/meals/reset — should clear all meals for the authenticated user", async () => {
    // Add two meals
    await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ type: "Snack", name: "Apple", calories: 95 });

    await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ type: "Dinner", name: "Salad", calories: 250 });

    const beforeReset = await request(app)
      .get("/api/meals")
      .set("Authorization", `Bearer ${userAToken}`);
    assert.equal(beforeReset.body.length, 2);

    const resetRes = await request(app)
      .post("/api/meals/reset")
      .set("Authorization", `Bearer ${userAToken}`);
    assert.equal(resetRes.status, 200);

    const afterReset = await request(app)
      .get("/api/meals")
      .set("Authorization", `Bearer ${userAToken}`);
    assert.equal(afterReset.body.length, 0);
  });
});
