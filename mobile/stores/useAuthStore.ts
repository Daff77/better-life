import { create } from "zustand";
import { AuthUser, AuthUserSchema } from "@/lib/schemas";
import { sessionStorage } from "@/lib/sessionStorage";
import { API_BASE_URL } from "@/lib/api/config";
import { activateAccount } from "@/lib/accountLifecycle";
import { accountRevision } from "@/lib/accountScope";
import {
  isJwtTokenExpired,
  registerUnauthorizedSessionHandler,
} from "@/lib/authToken";
import { calculatePersonalizedPlan } from "@/lib/nutritionDomain";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingCompleted: boolean;
  sessionNotice: string | null;
  initializeAuth: () => Promise<void>;
  login: (identifier: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (data: {
    name?: string;
    email: string;
    photoUrl?: string;
    idToken?: string;
  }) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  checkEmailAvailability: (email: string) => Promise<{ available: boolean; error?: string }>;
  logout: (options?: { reason?: string }) => Promise<void>;
  clearSessionNotice: () => void;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => void;
}

const AUTH_REQUEST_TIMEOUT_MS = 12000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetch(url, {
      ...init,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function hydrateServerProfileIntoAccountScope(serverProfile: any): Promise<void> {
  if (!serverProfile || typeof serverProfile !== "object") return;
  try {
    const existingLocal = await sessionStorage.getPersonalization();
    if (existingLocal) return;

    const birthDate =
      serverProfile.birthDate && typeof serverProfile.birthDate === "object"
        ? serverProfile.birthDate
        : { day: 15, month: "June", year: 2000 };

    const computed = calculatePersonalizedPlan({
      weight: Number(serverProfile.weight) || 70,
      height: Number(serverProfile.height) || 170,
      gender: serverProfile.gender === "Female" ? "Female" : "Male",
      birthDate,
      goal:
        serverProfile.goal === "Lose weight" || serverProfile.goal === "Gain muscle"
          ? serverProfile.goal
          : "Eat balanced",
    });

    await sessionStorage.savePersonalization({
      goal:
        serverProfile.goal === "Lose weight" || serverProfile.goal === "Gain muscle"
          ? serverProfile.goal
          : "Eat balanced",
      weight: Number(serverProfile.weight) || 70,
      targetWeight:
        serverProfile.targetWeight !== null && serverProfile.targetWeight !== undefined
          ? Number(serverProfile.targetWeight)
          : undefined,
      height: Number(serverProfile.height) || 170,
      gender: serverProfile.gender === "Female" ? "Female" : "Male",
      birthDate,
      cookingSkill:
        serverProfile.cookingSkill === "Low" || serverProfile.cookingSkill === "High"
          ? serverProfile.cookingSkill
          : "Middle",
      dietType: String(serverProfile.dietType || "Omnivore"),
      allergies: Array.isArray(serverProfile.allergies) ? serverProfile.allergies : [],
      targetCalories: Number(serverProfile.targetCalories) || computed.targetCalories,
      bmr: computed.bmr,
      tdee: computed.tdee,
      targetProteinGrams: computed.targetProteinGrams,
      targetCarbGrams: computed.targetCarbGrams,
      targetFatGrams: computed.targetFatGrams,
    });
  } catch {
    // non-fatal hydration helper
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  onboardingCompleted: false,
  sessionNotice: null,

  clearSessionNotice: () => set({ sessionNotice: null }),

  initializeAuth: async () => {
    try {
      await sessionStorage.sanitizeLegacyStorage();
      const session = await sessionStorage.getSession();

      if (
        !session ||
        !session.isAuthenticated ||
        !session.user ||
        !session.token
      ) {
        await sessionStorage.clearSession();
        await activateAccount();
        set({
          user: null,
          isAuthenticated: false,
          onboardingCompleted: false,
          isLoading: false,
        });
        return;
      }

      if (isJwtTokenExpired(session.token)) {
        await sessionStorage.clearSession();
        await activateAccount();
        set({
          user: null,
          isAuthenticated: false,
          onboardingCompleted: false,
          isLoading: false,
          sessionNotice: "Sesi Anda telah kedaluwarsa. Silakan masuk kembali.",
        });
        return;
      }

      await activateAccount(session.user.email);
      const rev = accountRevision();

      const user: AuthUser = {
        ...session.user,
        isAuthenticated: true,
      };
      set({
        user,
        isAuthenticated: true,
        onboardingCompleted: Boolean(session.onboardingCompleted),
        isLoading: false,
      });

      // Background server token validation when reachable (does NOT sign out on offline error)
      void (async () => {
        try {
          const res = await fetchWithTimeout(
            `${API_BASE_URL}/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
              },
            },
            6000
          );

          if (rev !== accountRevision()) return;

          if (res.status === 401 || res.status === 404) {
            const errBody: any = await res.json().catch(() => ({}));
            if (errBody?.error === "Unauthorized" || errBody?.error === "Not Found") {
              await get().logout({
                reason: "Sesi Anda sudah berakhir atau tidak lagi valid. Silakan masuk kembali.",
              });
            }
            return;
          }

          if (res.ok) {
            const meData: any = await res.json();
            if (rev !== accountRevision()) return;
            if (meData?.user && AuthUserSchema.safeParse(meData.user).success) {
              const verifiedUser: AuthUser = {
                ...meData.user,
                isAuthenticated: true,
              };
              const resolvedOnboarding =
                typeof meData.onboardingCompleted === "boolean"
                  ? meData.onboardingCompleted || Boolean(session.onboardingCompleted)
                  : Boolean(session.onboardingCompleted);

              await sessionStorage.saveSession({
                user: verifiedUser,
                isAuthenticated: true,
                onboardingCompleted: resolvedOnboarding,
                token: session.token,
              });

              if (rev === accountRevision()) {
                set({
                  user: verifiedUser,
                  onboardingCompleted: resolvedOnboarding,
                });
              }
            }
          }
        } catch {
          // Offline: preserve valid non-expired local session
        }
      })();
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        onboardingCompleted: false,
        isLoading: false,
      });
    }
  },

  checkEmailAvailability: async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        return {
          available: false,
          error: "Gagal memeriksa ketersediaan email. Pastikan format email benar.",
        };
      }
      const data: any = await res.json();
      return { available: Boolean(data.available) };
    } catch {
      return {
        available: false,
        error: "Server pendaftaran tidak dapat dihubungi. Periksa koneksi internet Anda.",
      };
    }
  },

  login: async (identifier: string, password?: string) => {
    const trimmed = identifier?.trim();
    if (!trimmed) {
      return { success: false, error: "Masukkan email atau username Anda." };
    }
    if (!password) {
      return { success: false, error: "Kata sandi wajib diisi." };
    }

    let authData: any;
    try {
      const payload = trimmed.includes("@")
        ? { email: trimmed.toLowerCase(), password }
        : { identifier: trimmed, password };

      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody: any = await res.json().catch(() => ({}));
        if (res.status === 401) {
          return {
            success: false,
            error: "Email/username atau kata sandi tidak sesuai.",
          };
        }
        return {
          success: false,
          error: errBody?.message || "Login ditolak server. Periksa kembali isian Anda.",
        };
      }

      authData = await res.json();
      if (!authData?.token || !AuthUserSchema.safeParse(authData?.user).success) {
        return {
          success: false,
          error: "Respons server autentikasi tidak valid.",
        };
      }
    } catch {
      return {
        success: false,
        error: "Server login tidak dapat dihubungi. Periksa koneksi internet Anda.",
      };
    }

    const verifiedEmail = String(authData.user.email).trim().toLowerCase();
    const cachedMeta = await sessionStorage.getAccountMeta(verifiedEmail);
    const onboardingCompleted =
      Boolean(authData.onboardingCompleted) || Boolean(cachedMeta?.onboardingCompleted);

    const sessionUser: AuthUser = {
      id: authData.user.id,
      name: authData.user.name,
      email: verifiedEmail,
      phone: authData.user.phone || undefined,
      isAuthenticated: true,
    };

    await sessionStorage.saveAccountMeta({
      id: String(authData.user.id),
      name: authData.user.name,
      email: verifiedEmail,
      phone: authData.user.phone || undefined,
      onboardingCompleted,
    });

    await sessionStorage.saveSession({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted,
      token: authData.token,
    });

    // Scope storage to this account BEFORE hydrating server profile so it writes to the right namespace
    await activateAccount(sessionUser.email);
    if (authData.profile) {
      await hydrateServerProfileIntoAccountScope(authData.profile);
      const { useOnboardingStore } = require("./useOnboardingStore");
      await useOnboardingStore.getState().initializePersonalization();
    }

    set({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted,
      sessionNotice: null,
      isLoading: false,
    });

    return { success: true };
  },

  loginWithGoogle: async (data: {
    name?: string;
    email: string;
    photoUrl?: string;
    idToken?: string;
  }) => {
    if (!data.idToken) {
      return {
        success: false,
        error: "Token Google tidak tersedia. Silakan login ulang melalui Google.",
      };
    }

    let verified: any;
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: data.idToken }),
      });
      if (!response.ok) {
        return {
          success: false,
          error: "Identitas Google ditolak server. Silakan login ulang.",
        };
      }
      verified = await response.json();
      if (!verified?.token || !AuthUserSchema.safeParse(verified?.user).success) {
        throw new Error("Invalid response");
      }
    } catch {
      return {
        success: false,
        error: "Login Google belum dapat diverifikasi. Periksa koneksi lalu coba lagi.",
      };
    }

    const trimmedEmail = String(verified.user.email).trim().toLowerCase();
    const existingMeta = await sessionStorage.getAccountMeta(trimmedEmail);
    const isNew = verified.isNewUser ?? !existingMeta;
    const onboardingCompleted =
      Boolean(verified.onboardingCompleted) || Boolean(existingMeta?.onboardingCompleted);

    await sessionStorage.saveAccountMeta({
      id: String(verified.user.id),
      name: verified.user.name,
      email: trimmedEmail,
      phone: verified.user.phone || undefined,
      onboardingCompleted,
    });

    const sessionUser: AuthUser = {
      ...verified.user,
      email: trimmedEmail,
      isAuthenticated: true,
    };

    await sessionStorage.saveSession({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted,
      token: verified.token,
    });

    await activateAccount(sessionUser.email);
    if (verified.profile) {
      await hydrateServerProfileIntoAccountScope(verified.profile);
      const { useOnboardingStore } = require("./useOnboardingStore");
      await useOnboardingStore.getState().initializePersonalization();
    }

    set({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted,
      sessionNotice: null,
      isLoading: false,
    });

    return { success: true, isNewUser: isNew };
  },

  signup: async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const trimmedName = data.name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: "Nama lengkap minimal 2 karakter." };
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return { success: false, error: "Format alamat email belum valid." };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, error: "Kata sandi minimal 6 karakter." };
    }

    let resData: any;
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: data.phone?.trim() || "+62 812-0000-0000",
          password: data.password,
        }),
      });

      if (!res.ok) {
        const errBody: any = await res.json().catch(() => ({}));
        if (res.status === 409) {
          return {
            success: false,
            error: "Email ini sudah terdaftar. Silakan masuk ke akun Anda.",
          };
        }
        return {
          success: false,
          error: errBody?.message || "Pendaftaran ditolak server. Periksa kembali data Anda.",
        };
      }

      resData = await res.json();
      if (!resData?.token || !AuthUserSchema.safeParse(resData?.user).success) {
        return {
          success: false,
          error: "Respons pendaftaran dari server tidak valid.",
        };
      }
    } catch {
      return {
        success: false,
        error: "Server pendaftaran tidak dapat dihubungi. Periksa koneksi internet Anda.",
      };
    }

    const verifiedEmail = String(resData.user.email).trim().toLowerCase();
    const sessionUser: AuthUser = {
      id: resData.user.id,
      name: resData.user.name,
      email: verifiedEmail,
      phone: resData.user.phone || data.phone?.trim() || undefined,
      isAuthenticated: true,
    };

    await sessionStorage.saveAccountMeta({
      id: String(resData.user.id),
      name: sessionUser.name,
      email: verifiedEmail,
      phone: sessionUser.phone,
      onboardingCompleted: false,
    });

    await sessionStorage.saveSession({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: false,
      token: resData.token,
    });

    await activateAccount(sessionUser.email);

    set({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: false,
      sessionNotice: null,
      isLoading: false,
    });

    return { success: true };
  },

  logout: async (options?: { reason?: string }) => {
    await sessionStorage.clearSession();
    await activateAccount();
    set({
      user: null,
      isAuthenticated: false,
      onboardingCompleted: false,
      sessionNotice: options?.reason ?? null,
      isLoading: false,
    });
  },

  setOnboardingCompleted: async (completed: boolean) => {
    const revision = accountRevision();
    const session = await sessionStorage.getSession();
    const { user } = get();
    if (user && session?.user.email === user.email && revision === accountRevision()) {
      await sessionStorage.updateAccountOnboarding(user.email, completed);
      if (revision !== accountRevision()) return;
      await sessionStorage.saveSession({
        ...session,
        user,
        isAuthenticated: true,
        onboardingCompleted: completed,
      });
      if (revision === accountRevision()) {
        set({ onboardingCompleted: completed });
      }
    }
  },

  updateUser: (data: Partial<AuthUser>) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...data };
      AuthUserSchema.safeParse(updated);
      return { user: updated };
    });
  },
}));

// Register centralized 401 token-expired handler so protected API calls automatically clean stale sessions
let verifyingUnauthorized = false;
registerUnauthorizedSessionHandler(async (expectedRevision?: number) => {
  if (expectedRevision !== undefined && expectedRevision !== accountRevision()) {
    return;
  }
  const current = useAuthStore.getState();
  if (!current.isAuthenticated || verifyingUnauthorized) return;

  const session = await sessionStorage.getSession();
  if (!session?.token) {
    await current.logout({
      reason: "Sesi login Anda telah kedaluwarsa. Silakan masuk kembali.",
    });
    return;
  }

  if (isJwtTokenExpired(session.token)) {
    await current.logout({
      reason: "Sesi login Anda telah kedaluwarsa. Silakan masuk kembali.",
    });
    return;
  }

  // Confirm with /auth/me so route-level errors or custom test mocks without auth errors don't falsely drop active sessions
  verifyingUnauthorized = true;
  try {
    const rev = accountRevision();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
      },
      5000
    );
    if (rev !== accountRevision()) return;
    if (res.status === 401 || res.status === 404) {
      const body: any = await res.json().catch(() => ({}));
      if (body?.error === "Unauthorized" || body?.error === "Not Found") {
        await useAuthStore.getState().logout({
          reason: "Sesi login Anda telah kedaluwarsa. Silakan masuk kembali.",
        });
      }
    }
  } catch {
    // Offline: keep valid non-expired local session intact
  } finally {
    verifyingUnauthorized = false;
  }
});
