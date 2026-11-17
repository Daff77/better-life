import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";

const client = new OAuth2Client();
export const googleIdentity = {
  async verify(idToken: string) {
    if (idToken.split(".").length !== 3) throw new Error("Malformed Google token");
    const audience = env.GOOGLE_CLIENT_IDS.split(",").map((id) => id.trim()).filter(Boolean);
    if (!audience.length) throw new Error("Google sign-in is not configured");
    const ticket = await client.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new Error("Unverified Google identity");
    return payload;
  },
};
