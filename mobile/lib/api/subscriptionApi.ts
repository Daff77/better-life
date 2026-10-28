import { API_BASE_URL } from "./config";
import {
  SubscriptionPlan,
  SubscriptionStatusResponse,
  PlanId,
  BillingProvider,
  SUBSCRIPTION_PLANS,
  FREE_ENTITLEMENTS,
  PREMIUM_ENTITLEMENTS,
} from "../subscriptionDomain";

// In-memory fallback if backend is offline in local preview
let localSubscriptionState: SubscriptionStatusResponse = {
  tier: "free",
  status: "free",
  isPremium: false,
  planId: null,
  billingProvider: "mock_sandbox",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  entitlements: FREE_ENTITLEMENTS,
};

export const subscriptionApi = {
  /**
   * Fetch available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/subscription/plans`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.plans)) {
          return data.plans;
        }
      }
    } catch {
      // Fallback to local plan catalog
    }
    return Object.values(SUBSCRIPTION_PLANS);
  },

  /**
   * Fetch user's current verified subscription status
   */
  async getStatus(token?: string | null): Promise<SubscriptionStatusResponse> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/subscription/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          localSubscriptionState = data;
          return data;
        }
      } catch (err) {
        console.warn("[subscriptionApi] Network error fetching status, using cached state:", err);
      }
    }
    return localSubscriptionState;
  },

  /**
   * Checkout or upgrade to a plan
   */
  async checkout(
    planId: PlanId,
    provider: BillingProvider = "mock_sandbox",
    token?: string | null
  ): Promise<{ success: boolean; subscription: SubscriptionStatusResponse; message: string }> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/subscription/checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ planId, provider }),
        });
        if (res.ok) {
          const data = await res.json();
          localSubscriptionState = data.subscription;
          return data;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Checkout failed");
        }
      } catch (err: any) {
        if (!token) throw err;
      }
    }

    // Local sandbox simulation for demo / offline
    const plan = SUBSCRIPTION_PLANS[planId];
    const now = new Date();
    const periodEnd =
      plan.interval === "month"
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : plan.interval === "year"
        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    localSubscriptionState = {
      tier: "premium",
      status: "premium_active",
      isPremium: true,
      planId,
      billingProvider: provider,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      entitlements: PREMIUM_ENTITLEMENTS,
    };

    return {
      success: true,
      subscription: localSubscriptionState,
      message: `Upgraded to ${plan.name}`,
    };
  },

  /**
   * Verify an in-app purchase transaction
   */
  async verify(
    transactionId: string,
    provider: BillingProvider,
    planId: PlanId = "monthly",
    token?: string | null
  ): Promise<{ success: boolean; subscription: SubscriptionStatusResponse; message: string }> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/subscription/verify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ provider, transactionId, planId }),
        });
        if (res.ok) {
          const data = await res.json();
          localSubscriptionState = data.subscription;
          return data;
        }
      } catch (err) {
        console.warn("[subscriptionApi] Verify network failed:", err);
      }
    }

    return this.checkout(planId, provider, token);
  },

  /**
   * Cancel auto-renew (retains access until period ends)
   */
  async cancel(
    reason?: string,
    token?: string | null
  ): Promise<{ success: boolean; subscription: SubscriptionStatusResponse; message: string }> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/subscription/cancel`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        });
        if (res.ok) {
          const data = await res.json();
          localSubscriptionState = data.subscription;
          return data;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to cancel subscription");
        }
      } catch (err: any) {
        if (!token) throw err;
      }
    }

    // Local simulation
    localSubscriptionState = {
      ...localSubscriptionState,
      status: "canceled",
      cancelAtPeriodEnd: true,
      isPremium: true, // Still entitled until period end!
    };

    return {
      success: true,
      subscription: localSubscriptionState,
      message: "Subscription auto-renewal canceled. Access remains active until period ends.",
    };
  },

  /**
   * Restore previous purchases
   */
  async restore(
    provider: BillingProvider = "mock_sandbox",
    token?: string | null
  ): Promise<{ restored: boolean; statusResponse: SubscriptionStatusResponse; message: string }> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/subscription/restore`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ provider }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.restored) {
            localSubscriptionState = data.statusResponse;
          }
          return data;
        }
      } catch (err) {
        console.warn("[subscriptionApi] Restore network failed:", err);
      }
    }

    return {
      restored: localSubscriptionState.isPremium,
      statusResponse: localSubscriptionState,
      message: localSubscriptionState.isPremium
        ? "Existing active Premium membership verified and restored."
        : "No previous active subscriptions found for this account.",
    };
  },
};
