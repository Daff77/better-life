import { test, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { generateKeyPairSync } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { CertificateFormat } from "google-auth-library/build/src/auth/oauth2client.js";
import { app } from "../index.js";
import { env } from "../config/env.js";
import { googleIdentity } from "../services/googleIdentity.js";

test("Google login verifies signatures, issuer, audience, expiry and email before issuing a session", async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const certs = mock.method(OAuth2Client.prototype, 'getFederatedSignonCertsAsync', async () => ({ certs: { fixture: publicKey.export({ type: 'spki', format: 'pem' }).toString() }, format: CertificateFormat.PEM }));
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: 'google-fixture-sub', email: 'verified-fixture@gmail.com', email_verified: true, name: 'Verified Fixture', iss: 'https://accounts.google.com', aud: env.GOOGLE_CLIENT_IDS.split(',')[0], iat: now, exp: now + 3600 };
  const sign = (change = {}) => jwt.sign({ ...claims, ...change }, privateKey, { algorithm: 'RS256', keyid: 'fixture' });
  try {
    await googleIdentity.verify(sign());
    assert.equal((await request(app).post('/api/auth/google').send({ email: 'daffa@gmail.com' })).status, 400);
    for (const token of ['forged', sign({ aud: 'foreign-app' }), sign({ iss: 'https://attacker.test' }), sign({ iat: now - 7200, exp: now - 3600 }), sign({ email_verified: false }), sign().slice(0, -10) + 'abcdefghij']) {
      assert.equal((await request(app).post('/api/auth/google').send({ idToken: token })).status, 401);
    }
    const accepted = await request(app).post('/api/auth/google').send({ idToken: sign(), email: 'victim@gmail.com', name: 'Forged' });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.user.email, claims.email);
    assert.equal(accepted.body.user.name, claims.name);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accepted.body.token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, claims.email);
  } finally { certs.mock.restore(); }
});
