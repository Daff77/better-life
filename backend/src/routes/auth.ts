import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  RegisterInputSchema,
  LoginInputSchema,
  CheckEmailInputSchema,
  GoogleAuthInputSchema,
} from "../schemas/validation.js";
import { userRepository, profileRepository } from "../repositories/index.js";
import { env } from "../config/env.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { googleIdentity } from "../services/googleIdentity.js";

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

// 0. Check Email Availability (Server-authoritative precheck for signup step 1)
authRouter.post(
  "/check-email",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = CheckEmailInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const existing = await userRepository.findByEmail(parseResult.data.email);
    return res.json({
      available: !existing,
    });
  })
);

// 1. User Registration
authRouter.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = RegisterInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const { name, email, phone, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        error: "Conflict",
        message: "An account with this email is already registered. Please log in.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await userRepository.create({
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || "",
      passwordHash,
    });

    const token = generateAuthToken(newUser.id, newUser.email);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
      },
      onboardingCompleted: false,
      token,
    });
  })
);

// 2. User Login
authRouter.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = LoginInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const rawIdentifier = (parseResult.data.email || parseResult.data.identifier || "").trim();
    const { password } = parseResult.data;

    const matchedUser = await userRepository.findByIdentifier(rawIdentifier);
    if (!matchedUser) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password.",
      });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, matchedUser.passwordHash);
    } catch {
      isMatch = false;
    }

    const isLegacyDemoMatch =
      !isMatch &&
      env.NODE_ENV !== "production" &&
      matchedUser.passwordHash === "hashed_pass_placeholder" &&
      (matchedUser.email === "johndoe25@gmail.com" || matchedUser.email === "daffa@gmail.com") &&
      password === "password123";

    if (!isMatch && !isLegacyDemoMatch) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password.",
      });
    }

    if (isLegacyDemoMatch) {
      const upgradedHash = await bcrypt.hash(password, 10);
      await userRepository.update(matchedUser.id, { passwordHash: upgradedHash });
    }

    const profile = await profileRepository.findByUserId(matchedUser.id);
    const token = generateAuthToken(matchedUser.id, matchedUser.email);

    return res.json({
      message: "Login successful",
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        phone: matchedUser.phone,
      },
      onboardingCompleted: Boolean(profile?.onboardingCompleted),
      profile: profile || null,
      token,
    });
  })
);

// 3. Google OAuth Login / Sync
authRouter.post(
  "/google",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = GoogleAuthInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    let identity;
    try {
      identity = await googleIdentity.verify(parseResult.data.idToken);
    } catch {
      return res
        .status(401)
        .json({ error: "Unauthorized", message: "Google identity could not be verified." });
    }

    const normalizedEmail = identity.email!.toLowerCase().trim();
    const name = identity.name;
    const photoUrl = identity.picture;

    let matchedUser = await userRepository.findByEmail(normalizedEmail);
    let isNewUser = false;

    if (matchedUser?.googleSubject && matchedUser.googleSubject !== identity.sub) {
      return res
        .status(401)
        .json({ error: "Unauthorized", message: "Google account does not match." });
    }

    const existingSubOwner = await userRepository.findByGoogleSubject(identity.sub);
    if (existingSubOwner && matchedUser && existingSubOwner.id !== matchedUser.id) {
      return res
        .status(401)
        .json({ error: "Unauthorized", message: "Google account is already linked elsewhere." });
    }

    if (
      matchedUser &&
      !matchedUser.googleSubject &&
      !normalizedEmail.endsWith("@gmail.com") &&
      !identity.hd
    ) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Sign in with your password to link this account.",
      });
    }

    if (!matchedUser) {
      isNewUser = true;
      const dummyHash = await bcrypt.hash(`oauth_google_${Date.now()}_${identity.sub}`, 10);
      matchedUser = await userRepository.create({
        id: `google-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name?.trim() || normalizedEmail.split("@")[0] || "Google User",
        email: normalizedEmail,
        phone: "",
        passwordHash: dummyHash,
        googleSubject: identity.sub,
      });
    } else if (!matchedUser.googleSubject) {
      matchedUser =
        (await userRepository.update(matchedUser.id, { googleSubject: identity.sub })) ??
        matchedUser;
    }

    const profile = await profileRepository.findByUserId(matchedUser.id);
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
      isNewUser,
      onboardingCompleted: Boolean(profile?.onboardingCompleted),
      profile: profile || null,
      token,
    });
  })
);

// 4. Authenticated User Profile Status (/me)
authRouter.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User account could not be found.",
      });
    }

    const profile = await profileRepository.findByUserId(userId);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      onboardingCompleted: Boolean(profile?.onboardingCompleted),
      profile: profile || null,
    });
  })
);
