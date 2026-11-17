import { API_BASE_URL } from "./config";
import { accountRevision } from "../accountScope";
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

const emptySubscriptionState = { ...localSubscriptionState };
export function resetSubscriptionCache() { localSubscriptionState = { ...emptySubscriptionState }; }
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
    const revision = accountRevision();
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
          if (revision === accountRevision()) localSubscriptionState = data;
          return data;
        }
      } catch {
        // Fallback silently to cached state
      }
    }
    return { ...emptySubscriptionState };
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
        throw err;
      }
    }

    throw new Error("Verified checkout requires a connection to the payment server.");
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
      } catch {
        // Fallback silently
      }
    }

    throw new Error("Purchase could not be verified by the payment server.");
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
        throw err;
      }
    }

    throw new Error("Cancellation requires a connection to the payment server.");
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
      } catch {
        // Fallback silently
      }
    }

    throw new Error("Restoring purchases requires verification by the payment server.");
  },
};
