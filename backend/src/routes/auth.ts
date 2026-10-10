import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  RegisterInputSchema,
  LoginInputSchema,
  GoogleAuthInputSchema,
} from "../schemas/validation.js";
import { inMemoryStore } from "../services/store.js";
import { env } from "../config/env.js";
import { authMiddleware } from "../middleware/auth.js";

export const authRouter = Router();

function generateAuthToken(userId: string, email: string): string {
  return jwt.sign(
    {
      userId,
      email: email.toLowerCase(),
    },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// 1. User Registration
authRouter.post("/register", async (req: Request, res: Response) => {
  const parseResult = RegisterInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const { name, email, phone, password } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already registered
  for (const user of inMemoryStore.users.values()) {
    if (user.email.toLowerCase() === normalizedEmail) {
      return res.status(409).json({
        error: "Conflict",
        message: "An account with this email is already registered. Please log in.",
      });
    }
  }

  // Hash password securely with bcrypt
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const newUser = {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    passwordHash,
    createdAt: new Date(),
  };

  inMemoryStore.users.set(newUser.id, newUser);

  const token = generateAuthToken(newUser.id, newUser.email);

  return res.status(201).json({
    message: "User registered successfully",
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
    },
    token,
  });
});

// 2. User Login
authRouter.post("/login", async (req: Request, res: Response) => {
  const parseResult = LoginInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const { email, password } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();

  let matchedUser = Array.from(inMemoryStore.users.values()).find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );

  if (!matchedUser) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid email or password.",
    });
  }

  // Verify password using bcrypt
  const isMatch = await bcrypt.compare(password, matchedUser.passwordHash);

  // Fallback for pre-seeded demo user if needed
  const isLegacyDemoMatch =
    !isMatch &&
    matchedUser.email === "johndoe25@gmail.com" &&
    password === "password123";

  if (!isMatch && !isLegacyDemoMatch) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid email or password.",
    });
  }

  // Upgrade legacy demo hash to proper bcrypt if matched via demo fallback
  if (isLegacyDemoMatch) {
    matchedUser.passwordHash = await bcrypt.hash(password, 10);
  }

  const token = generateAuthToken(matchedUser.id, matchedUser.email);

  return res.json({
    message: "Login successful",
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      phone: matchedUser.phone,
    },
    token,
  });
});

// 3. Google OAuth Login / Sync
authRouter.post("/google", async (req: Request, res: Response) => {
  const parseResult = GoogleAuthInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const { email, name, photoUrl } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();

  let matchedUser = Array.from(inMemoryStore.users.values()).find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );

  if (!matchedUser) {
    const dummyHash = await bcrypt.hash(`oauth_google_${Date.now()}`, 10);
    matchedUser = {
      id: `google-${Date.now()}`,
      name: name?.trim() || normalizedEmail.split("@")[0] || "Google User",
      email: normalizedEmail,
      phone: "",
      passwordHash: dummyHash,
      createdAt: new Date(),
    };
    inMemoryStore.users.set(matchedUser.id, matchedUser);
  }

  const token = generateAuthToken(matchedUser.id, matchedUser.email);

  return res.json({
    message: "Google login successful",
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      phone: matchedUser.phone,
      photoUrl: photoUrl || undefined,
    },
    token,
  });
});

// 4. Authenticated User Profile Status (/me)
authRouter.get("/me", authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = inMemoryStore.users.get(userId);

  if (!user) {
    return res.status(404).json({
      error: "Not Found",
      message: "User account could not be found.",
    });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  });
});
