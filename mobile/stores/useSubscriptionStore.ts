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
import {
  subscriptionApi,
  PaymentReadiness,
  DEFAULT_PAYMENT_READINESS,
} from "../lib/api/subscriptionApi";
import { sessionStorage } from "../lib/sessionStorage";
import { accountRevision } from "../lib/accountScope";

interface SubscriptionState {
  tier: MembershipTier;
  status: SubscriptionStatus;
  isPremium: boolean;
  planId: PlanId | null;
  billingProvider: BillingProvider | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: readonly Entitlement[];
  paymentReadiness: PaymentReadiness;
  pendingSessionId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isUpgrading: boolean;
  error: string | null;

  fetchStatus: () => Promise<void>;
  upgradePlan: (
    planId: PlanId,
    provider?: BillingProvider
  ) => Promise<{
    success: boolean;
    error?: string;
    checkoutUrl?: string;
    sessionId?: string;
    sandboxMode?: boolean;
    message?: string;
  }>;
  verifyCheckoutSession: (
    sessionId: string,
    planId: PlanId
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
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
  billingProvider: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  entitlements: FREE_ENTITLEMENTS,
  paymentReadiness: DEFAULT_PAYMENT_READINESS,
  pendingSessionId: null,
  checkoutUrl: null,
  isLoading: false,
  isUpgrading: false,
  error: null,

  fetchStatus: async () => {
    const revision = accountRevision();
    set({ isLoading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = session?.token || null;
      const [data, catalog] = await Promise.all([
        subscriptionApi.getStatus(token),
        subscriptionApi.getCatalogAndReadiness(),
      ]);
      if (revision !== accountRevision()) return;

      set({
        tier: data.tier,
        status: data.status,
        isPremium: data.isPremium,
        planId: data.planId ?? null,
        billingProvider: data.billingProvider ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
        entitlements: data.entitlements || (data.isPremium ? PREMIUM_ENTITLEMENTS : FREE_ENTITLEMENTS),
        paymentReadiness: catalog.paymentReadiness,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Gagal memuat status langganan.",
      });
    }
  },

  upgradePlan: async (planId: PlanId, explicitProvider?: BillingProvider) => {
    set({ isUpgrading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = session?.token || null;
      const readiness = get().paymentReadiness;
      const resolvedProvider: BillingProvider =
        explicitProvider ??
        (readiness.stripeConfigured
          ? "stripe"
          : readiness.sandboxEnabled
          ? "mock_sandbox"
          : "stripe");

      const res = await subscriptionApi.checkout(planId, resolvedProvider, token);

      set({
        tier: res.subscription.tier,
        status: res.subscription.status,
        isPremium: res.subscription.isPremium,
        planId: res.subscription.planId ?? planId,
        billingProvider: res.subscription.billingProvider ?? resolvedProvider,
        currentPeriodEnd: res.subscription.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: Boolean(res.subscription.cancelAtPeriodEnd),
        entitlements: res.subscription.entitlements,
        pendingSessionId: res.sessionId ?? null,
        checkoutUrl: res.checkoutUrl ?? null,
        isUpgrading: false,
        error: null,
      });

      return {
        success: true,
        checkoutUrl: res.checkoutUrl,
        sessionId: res.sessionId,
        sandboxMode: res.sandboxMode,
        message: res.message,
      };
    } catch (err: any) {
      const errorMsg = err.message || "Gagal memulai proses pembayaran.";
      set({ isUpgrading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  verifyCheckoutSession: async (sessionId: string, planId: PlanId) => {
    set({ isUpgrading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = session?.token || null;
      const res = await subscriptionApi.verify(sessionId, "stripe", planId, token);

      set({
        tier: res.subscription.tier,
        status: res.subscription.status,
        isPremium: res.subscription.isPremium,
        planId: res.subscription.planId ?? planId,
        billingProvider: res.subscription.billingProvider ?? "stripe",
        currentPeriodEnd: res.subscription.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: Boolean(res.subscription.cancelAtPeriodEnd),
        entitlements: res.subscription.entitlements,
        pendingSessionId: res.subscription.isPremium ? null : sessionId,
        isUpgrading: false,
        error: null,
      });

      return { success: true, message: res.message };
    } catch (err: any) {
      const errorMsg = err.message || "Pembayaran belum terverifikasi.";
      set({ isUpgrading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  cancelSubscription: async (reason?: string) => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = session?.token || null;
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
      const errorMsg = err.message || "Gagal membatalkan perpanjangan otomatis.";
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = session?.token || null;
      const provider = get().billingProvider || "stripe";
      const res = await subscriptionApi.restore(provider, token);

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
      return { restored: false, message: err.message || "Tidak dapat terhubung ke server langganan." };
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
      billingProvider: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      entitlements: FREE_ENTITLEMENTS,
      paymentReadiness: DEFAULT_PAYMENT_READINESS,
      pendingSessionId: null,
      checkoutUrl: null,
      isLoading: false,
      isUpgrading: false,
      error: null,
    });
  },
}));
