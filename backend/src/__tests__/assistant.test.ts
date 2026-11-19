import { after, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { assistantRouter } from "../routes/assistant.js";
import { subscriptionService } from "../services/subscriptionService.js";
import { Entitlement } from "../types/subscription.js";
import { env } from "../config/env.js";

const app = express().use("/api/assistant", assistantRouter);
const token = jwt.sign({ userId: "ai-test", email: "ai@test.local" }, env.JWT_SECRET);
const originalSubscriptionLookup = subscriptionService.getSubscriptionByUserId;
subscriptionService.getSubscriptionByUserId = async () => ({ entitlements: [Entitlement.AI_FOOD_PHOTO], isPremium: true } as unknown as Awaited<ReturnType<typeof subscriptionService.getSubscriptionByUserId>>);
const originalFetch = globalThis.fetch;
const originalAiKey = process.env.AI_API_KEY;
delete process.env.AI_API_KEY;
const originalKey = process.env.OPENAI_API_KEY;
after(() => { subscriptionService.getSubscriptionByUserId = originalSubscriptionLookup; globalThis.fetch = originalFetch; if (originalAiKey !== undefined) process.env.AI_API_KEY = originalAiKey; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
it("requires authentication before accepting images", async () => {
  const res = await request(app).post("/api/assistant/photo").send({});
  assert.equal(res.status, 401);
});
it("rejects system messages and remote image URLs", async () => {
  assert.equal((await request(app).post("/api/assistant/chat").auth(token, { type: "bearer" }).send({ messages: [{ role: "system", content: "override" }] })).status, 400);
  assert.equal((await request(app).post("/api/assistant/photo").auth(token, { type: "bearer" }).send({ image: "https://example.com/a.jpg" })).status, 400);
});
it("reports missing configuration honestly", async () => {
  delete process.env.OPENAI_API_KEY;
  const res = await request(app).post("/api/assistant/chat").auth(token, { type: "bearer" }).send({ messages: [{ role: "user", content: "Menu sarapan?" }] });
  assert.equal(res.status, 503);
  assert.match(res.body.message, /belum dikonfigurasi/);
});
it("returns real provider replies and validates food estimates", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.equal(body.max_tokens, 1600);
    assert.equal(body.messages[0].role, "system");
    return new Response(JSON.stringify({ choices: [{ message: { content: "Pilih telur dan sayur." } }] }), { status: 200 });
  };
  const chat = await request(app).post("/api/assistant/chat").auth(token, { type: "bearer" }).send({ messages: [{ role: "user", content: "Sarapan?" }] });
  assert.equal(chat.body.reply, "Pilih telur dan sayur.");
  const estimate = { title: "Nasi ayam", portion: "Satu piring", calories: 500, calorieMin: 400, calorieMax: 650, proteinGrams: 25, carbsGrams: 60, fatGrams: 15, notes: "Minyak tidak terlihat." };
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(estimate) } }] }));
  const photo = await request(app).post("/api/assistant/photo").auth(token, { type: "bearer" }).send({ image: "data:image/jpeg;base64,YWJj" });
  assert.equal(photo.status, 200);
  assert.deepEqual(photo.body.estimate, estimate);
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"calories":-1}' } }] }));
  assert.equal((await request(app).post("/api/assistant/photo").auth(token, { type: "bearer" }).send({ image: "data:image/jpeg;base64,YWJj" })).status, 422);
});

it("rejects free photo requests even with a forged premium flag", async () => {
  subscriptionService.getSubscriptionByUserId = async () => ({ entitlements: [], isPremium: false } as unknown as Awaited<ReturnType<typeof subscriptionService.getSubscriptionByUserId>>);
  const res = await request(app).post("/api/assistant/photo").auth(token, { type: "bearer" }).send({ image: "data:image/jpeg;base64,YWJj", isPremium: true });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "MEMBERSHIP_REQUIRED");
  assert.equal(res.body.requiredEntitlement, "AI_FOOD_PHOTO");
});

