import { create } from "zustand";
import {
  MembershipTier,
  SubscriptionStatus,
  PlanId,
  Entitlement,
  FREE_ENTITLEMENTS,
  PREMIUM_ENTITLEMENTS,
  isEntitled as checkIsEntitled,
  BillingProvider,
} from "../lib/subscriptionDomain";
import { subscriptionApi } from "../lib/api/subscriptionApi";
import { sessionStorage } from "../lib/sessionStorage";

interface SubscriptionState {
  tier: MembershipTier;
  status: SubscriptionStatus;
  isPremium: boolean;
  planId: PlanId | null;
  billingProvider: BillingProvider | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: readonly Entitlement[];
  isLoading: boolean;
  isUpgrading: boolean;
  error: string | null;

  // Actions
  fetchStatus: () => Promise<void>;
  upgradePlan: (planId: PlanId, provider?: BillingProvider) => Promise<{ success: boolean; error?: string }>;
  cancelSubscription: (reason?: string) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ restored: boolean; message: string }>;
  hasEntitlement: (entitlement: Entitlement) => boolean;
  resetState: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: "free",
  status: "free",
  isPremium: false,
  planId: null,
  billingProvider: "mock_sandbox",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  entitlements: FREE_ENTITLEMENTS,
  isLoading: false,
  isUpgrading: false,
  error: null,

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = (session as any)?.token || null;
      const data = await subscriptionApi.getStatus(token);

      set({
        tier: data.tier,
        status: data.status,
        isPremium: data.isPremium,
        planId: data.planId ?? null,
        billingProvider: data.billingProvider ?? "mock_sandbox",
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
        entitlements: data.entitlements || (data.isPremium ? PREMIUM_ENTITLEMENTS : FREE_ENTITLEMENTS),
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Failed to load subscription status",
      });
    }
  },

  upgradePlan: async (planId: PlanId, provider: BillingProvider = "mock_sandbox") => {
    set({ isUpgrading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = (session as any)?.token || null;
      const res = await subscriptionApi.checkout(planId, provider, token);

      set({
        tier: res.subscription.tier,
        status: res.subscription.status,
        isPremium: res.subscription.isPremium,
        planId: res.subscription.planId ?? planId,
        billingProvider: res.subscription.billingProvider ?? provider,
        currentPeriodEnd: res.subscription.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: Boolean(res.subscription.cancelAtPeriodEnd),
        entitlements: res.subscription.entitlements,
        isUpgrading: false,
        error: null,
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || "Failed to upgrade subscription";
      set({ isUpgrading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  cancelSubscription: async (reason?: string) => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = (session as any)?.token || null;
      const res = await subscriptionApi.cancel(reason, token);

      set({
        tier: res.subscription.tier,
        status: res.subscription.status,
        isPremium: res.subscription.isPremium,
        cancelAtPeriodEnd: true,
        isLoading: false,
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || "Failed to cancel subscription";
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = (session as any)?.token || null;
      const res = await subscriptionApi.restore(get().billingProvider || "mock_sandbox", token);

      if (res.restored) {
        set({
          tier: res.statusResponse.tier,
          status: res.statusResponse.status,
          isPremium: res.statusResponse.isPremium,
          planId: res.statusResponse.planId ?? null,
          billingProvider: res.statusResponse.billingProvider ?? null,
          currentPeriodEnd: res.statusResponse.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: res.statusResponse.cancelAtPeriodEnd,
          entitlements: res.statusResponse.entitlements,
        });
      }

      set({ isLoading: false });
      return { restored: res.restored, message: res.message };
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return { restored: false, message: "Could not connect to billing server." };
    }
  },

  hasEntitlement: (entitlement: Entitlement) => {
    const { tier, status, currentPeriodEnd } = get();
    return checkIsEntitled(tier, status, currentPeriodEnd, entitlement);
  },

  resetState: () => {
    set({
      tier: "free",
      status: "free",
      isPremium: false,
      planId: null,
      billingProvider: "mock_sandbox",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      entitlements: FREE_ENTITLEMENTS,
      isLoading: false,
      isUpgrading: false,
      error: null,
    });
  },
}));
