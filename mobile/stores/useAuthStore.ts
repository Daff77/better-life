import { create } from "zustand";
import { AuthUser, AuthUserSchema } from "@/lib/schemas";
import { sessionStorage, StoredAccount } from "@/lib/sessionStorage";

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
        set({
          user: null,
          isAuthenticated: false,
          onboardingCompleted: false,
          isLoading: false,
        });
      }
    } catch (err) {
      console.warn("[useAuthStore] initializeAuth failed:", err);
      set({
        user: null,
        isAuthenticated: false,
        onboardingCompleted: false,
        isLoading: false,
      });
    }
  },

  login: async (email: string, password?: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const accounts = await sessionStorage.getAccounts();
    const account = accounts.find((a) => a.email.toLowerCase() === trimmedEmail);

    if (!account) {
      return {
        success: false,
        error: "No account found with this email. Please sign up first.",
      };
    }

    if (password && account.password && account.password !== password) {
      return {
        success: false,
        error: "Incorrect password. Please verify your credentials.",
      };
    }

    const sessionUser: AuthUser = {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      isAuthenticated: true,
    };

    await sessionStorage.saveSession({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: account.onboardingCompleted,
    });

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
  }) => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const accounts = await sessionStorage.getAccounts();
    let account = accounts.find((a) => a.email.toLowerCase() === trimmedEmail);
    let isNew = false;

    if (!account) {
      isNew = true;
      account = {
        id: `google-${Date.now()}`,
        name: data.name?.trim() || trimmedEmail.split("@")[0] || "Google User",
        email: trimmedEmail,
        password: "google_oauth_authenticated",
        phone: undefined,
        onboardingCompleted: false,
      };
      await sessionStorage.saveAccount(account);
    }

    const sessionUser: AuthUser = {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      isAuthenticated: true,
    };

    await sessionStorage.saveSession({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: account.onboardingCompleted,
    });

    // Optional sync with backend API if active
    try {
      await fetch("http://localhost:4000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sessionUser.email,
          name: sessionUser.name,
          photoUrl: data.photoUrl,
        }),
      });
    } catch {
      // Local session works seamlessly even without backend
    }

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

    await sessionStorage.saveSession({
      user: sessionUser,
      isAuthenticated: true,
      onboardingCompleted: false,
    });

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
    set({
      user: null,
      isAuthenticated: false,
      onboardingCompleted: false,
      isLoading: false,
    });
  },

  setOnboardingCompleted: async (completed: boolean) => {
    set({ onboardingCompleted: completed });
    const { user } = get();
    if (user && user.email) {
      await sessionStorage.updateAccountOnboarding(user.email, completed);
      await sessionStorage.saveSession({
        user,
        isAuthenticated: true,
        onboardingCompleted: completed,
      });
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
