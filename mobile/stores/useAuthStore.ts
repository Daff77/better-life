import { create } from "zustand";
import { AuthUser, AuthUserSchema } from "@/lib/schemas";
import { sessionStorage, StoredAccount } from "@/lib/sessionStorage";
import { API_BASE_URL } from "@/lib/api/config";
import { activateAccount } from "@/lib/accountLifecycle";
import { accountRevision } from "@/lib/accountScope";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingCompleted: boolean;
  initializeAuth: () => Promise<void>;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
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
  logout: () => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  onboardingCompleted: false,

  initializeAuth: async () => {
    try {
      const session = await sessionStorage.getSession();
      if (session && session.isAuthenticated && session.user) {
        await activateAccount(session.user.email);
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
      } else {
        await activateAccount();
        set({
          user: null,
          isAuthenticated: false,
          onboardingCompleted: false,
          isLoading: false,
        });
      }
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        onboardingCompleted: false,
        isLoading: false,
      });
    }
  },

  login: async (identifier: string, password?: string) => {
    if (!password) return { success: false, error: "Kata sandi wajib diisi." };
    const trimmed = identifier.trim().toLowerCase();
    const accounts = await sessionStorage.getAccounts();
    const account = accounts.find(
      (a) =>
        a.email.toLowerCase() === trimmed ||
        a.name.toLowerCase() === trimmed ||
        a.email.split("@")[0].toLowerCase() === trimmed
    );

    if (!account) {
      return {
        success: false,
        error: "Akun dengan email atau username ini belum terdaftar. Silakan daftar terlebih dahulu.",
      };
    }

    if (password && account.password && account.password !== password) {
      return {
        success: false,
        error: "Kata sandi salah. Periksa kembali kata sandi Anda.",
      };
    }

    const sessionUser: AuthUser = {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      isAuthenticated: true,
    };

    let token: string | undefined = undefined;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email.toLowerCase(), password: password || "password123" }),
      });
      if (res.ok) {
        const authData = await res.json();
        token = authData.token;
      } else return { success: false, error: "Login ditolak server. Periksa email dan kata sandi." };
    } catch {
      return { success: false, error: "Server login tidak dapat dihubungi." };
    }

    await sessionStorage.saveSession({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: account.onboardingCompleted,
      token,
    });

    await activateAccount(sessionUser.email);

    set({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: account.onboardingCompleted,
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
    if (!data.idToken) return { success: false, error: "Token Google tidak tersedia. Silakan login ulang melalui Google." };
    let verified;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: data.idToken }),
      });
      if (!response.ok) return { success: false, error: "Identitas Google ditolak server. Silakan login ulang." };
      verified = await response.json();
      if (!verified.token || !AuthUserSchema.safeParse(verified.user).success) throw new Error("Invalid response");
    } catch { return { success: false, error: "Login Google belum dapat diverifikasi. Periksa koneksi lalu coba lagi." }; }
    const trimmedEmail = verified.user.email.trim().toLowerCase();
    const accounts = await sessionStorage.getAccounts();
    let account = accounts.find((a) => a.email.toLowerCase() === trimmedEmail);
    let isNew = false;

    if (!account) {
      isNew = true;
      account = {
        id: verified.user.id,
        name: verified.user.name,
        email: trimmedEmail,
        password: "google_oauth_authenticated",
        phone: undefined,
        onboardingCompleted: false,
      };
      await sessionStorage.saveAccount(account);
    }

    const sessionUser: AuthUser = {
      ...verified.user,
      isAuthenticated: true,
    };

    const token: string = verified.token;

    await sessionStorage.saveSession({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: account.onboardingCompleted,
      token,
    });

    await activateAccount(sessionUser.email);

    set({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: account.onboardingCompleted,
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
    const accounts = await sessionStorage.getAccounts();
    const existing = accounts.find((a) => a.email.toLowerCase() === trimmedEmail);

    if (existing) {
      return {
        success: false,
        error: "An account with this email already exists. Please login instead.",
      };
    }

    const newAccount: StoredAccount = {
      id: `user-${Date.now()}`,
      name: data.name.trim(),
      email: trimmedEmail,
      password: data.password,
      phone: data.phone?.trim() || undefined,
      onboardingCompleted: false,
    };

    await sessionStorage.saveAccount(newAccount);

    const sessionUser: AuthUser = {
      id: newAccount.id,
      name: newAccount.name,
      email: newAccount.email,
      phone: newAccount.phone,
      isAuthenticated: true,
    };

    let token: string | undefined = undefined;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          email: trimmedEmail,
          phone: data.phone?.trim() || "+62 812-3456-7890",
          password: data.password,
        }),
      });
      if (res.ok) {
        const resData = await res.json();
        token = resData.token;
      }
    } catch {
      // Backend offline
    }

    await sessionStorage.saveSession({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: false,
      token,
    });

    await activateAccount(sessionUser.email);

    set({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: false,
      isLoading: false,
    });

    return { success: true };
  },

  logout: async () => {
    await sessionStorage.clearSession();
    await activateAccount();
    set({
      user: null,
      isAuthenticated: false,
      onboardingCompleted: false,
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
      if (revision === accountRevision()) set({ onboardingCompleted: completed });
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
