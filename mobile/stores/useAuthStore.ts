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
