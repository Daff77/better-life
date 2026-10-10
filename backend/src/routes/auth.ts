import { Router, Request, Response } from "express";
import {
  RegisterInputSchema,
  LoginInputSchema,
  GoogleAuthInputSchema,
} from "../schemas/validation.js";
import { inMemoryStore } from "../services/store.js";

export const authRouter = Router();

authRouter.post("/register", (req: Request, res: Response) => {
  const parseResult = RegisterInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { name, email, phone, password } = parseResult.data;

  // Check existing
  for (const user of inMemoryStore.users.values()) {
    if (user.email === email) {
      return res.status(409).json({ error: "Email already registered" });
    }
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    phone,
    passwordHash: `hash_${password}`,
    createdAt: new Date(),
  };

  inMemoryStore.users.set(newUser.id, newUser);

  return res.status(201).json({
    message: "User registered successfully",
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
    },
    token: `token_${newUser.id}`,
  });
});

authRouter.post("/login", (req: Request, res: Response) => {
  const parseResult = LoginInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { email } = parseResult.data;

  let matchedUser = Array.from(inMemoryStore.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!matchedUser) {
    // Auto provision prototype user for seamless testing
    matchedUser = {
      id: `user-${Date.now()}`,
      name: email.split("@")[0] || "User",
      email,
      phone: "+62 812-3456-7890",
      passwordHash: "dummy_hash",
      createdAt: new Date(),
    };
    inMemoryStore.users.set(matchedUser.id, matchedUser);
  }

  return res.json({
    message: "Login successful",
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      phone: matchedUser.phone,
    },
    token: `token_${matchedUser.id}`,
  });
});

authRouter.post("/google", (req: Request, res: Response) => {
  const parseResult = GoogleAuthInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { email, name, photoUrl } = parseResult.data;

  let matchedUser = Array.from(inMemoryStore.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!matchedUser) {
    matchedUser = {
      id: `google-${Date.now()}`,
      name: name || email.split("@")[0] || "Google User",
      email: email.toLowerCase(),
      phone: "",
      passwordHash: "oauth_google",
      createdAt: new Date(),
    };
    inMemoryStore.users.set(matchedUser.id, matchedUser);
  }

  return res.json({
    message: "Google login successful",
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      phone: matchedUser.phone,
      photoUrl: photoUrl || undefined,
    },
    token: `token_${matchedUser.id}`,
  });
});
