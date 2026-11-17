import { API_BASE_URL } from "./config";
import { accountRevision } from "../accountScope";
import { notifyUnauthorizedSession } from "../authToken";
import {
  SubscriptionPlan,
  SubscriptionStatusResponse,
  PlanId,
  BillingProvider,
  SUBSCRIPTION_PLANS,
  FREE_ENTITLEMENTS,
} from "../subscriptionDomain";

export interface PaymentReadiness {
  configuredProviders: BillingProvider[];
  stripeConfigured: boolean;
  sandboxEnabled: boolean;
  canCheckout: boolean;
  missingRequirements: string[];
}

export const DEFAULT_PAYMENT_READINESS: PaymentReadiness = {
  configuredProviders: [],
  stripeConfigured: false,
  sandboxEnabled: false,
  canCheckout: false,
  missingRequirements: [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_MONTHLY & STRIPE_PRICE_ANNUAL",
  ],
};

let localSubscriptionState: SubscriptionStatusResponse = {
  tier: "free",
  status: "free",
  isPremium: false,
  planId: null,
  billingProvider: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  entitlements: FREE_ENTITLEMENTS,
};

const emptySubscriptionState = { ...localSubscriptionState };

export function resetSubscriptionCache() {
  localSubscriptionState = { ...emptySubscriptionState };
}

export const subscriptionApi = {
  async getCatalogAndReadiness(): Promise<{
    plans: SubscriptionPlan[];
    paymentReadiness: PaymentReadiness;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/subscription/plans`);
      if (res.ok) {
        const data = await res.json();
        return {
          plans: Array.isArray(data?.plans) ? data.plans : Object.values(SUBSCRIPTION_PLANS),
          paymentReadiness: data?.paymentReadiness ?? DEFAULT_PAYMENT_READINESS,
        };
      }
    } catch {
      // Fallback to unconfigured readiness when server is unreachable
    }
    return {
      plans: Object.values(SUBSCRIPTION_PLANS),
      paymentReadiness: DEFAULT_PAYMENT_READINESS,
    };
  },

  async getPlans(): Promise<SubscriptionPlan[]> {
    const res = await this.getCatalogAndReadiness();
    return res.plans;
  },

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
        if (res.status === 401 && revision === accountRevision()) {
          await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
          return { ...emptySubscriptionState };
        }
        if (res.ok) {
          const data = await res.json();
          if (revision === accountRevision()) localSubscriptionState = data;
          return data;
        }
      } catch {
        // Return last verified or free state
      }
    }
    return { ...emptySubscriptionState };
  },

  async checkout(
    planId: PlanId,
    provider: BillingProvider = "stripe",
    token?: string | null,
    urls?: { successUrl?: string; cancelUrl?: string }
  ): Promise<{
    success: boolean;
    subscription: SubscriptionStatusResponse;
    checkoutUrl?: string;
    sessionId?: string;
    sandboxMode?: boolean;
    message: string;
  }> {
    if (!token) {
      throw new Error("Silakan masuk ke akun terlebih dahulu sebelum melakukan pembayaran.");
    }

    const res = await fetch(`${API_BASE_URL}/subscription/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId,
        provider,
        successUrl: urls?.successUrl,
        cancelUrl: urls?.cancelUrl,
      }),
    });

    if (res.status === 401) {
      await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
      throw new Error("Sesi telah berakhir. Silakan masuk kembali.");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data.message || "Checkout tidak dapat diproses karena gateway pembayaran belum dikonfigurasi."
      );
    }

    localSubscriptionState = data.subscription;
    return data;
  },

  async verify(
    transactionId: string,
    provider: BillingProvider,
    planId: PlanId = "monthly",
    token?: string | null
  ): Promise<{ success: boolean; subscription: SubscriptionStatusResponse; message: string }> {
    if (!token) {
      throw new Error("Silakan masuk ke akun terlebih dahulu untuk memverifikasi transaksi.");
    }

    const res = await fetch(`${API_BASE_URL}/subscription/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider, transactionId, planId }),
    });

    if (res.status === 401) {
      await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
      throw new Error("Sesi telah berakhir. Silakan masuk kembali.");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Transaksi belum terverifikasi oleh penyedia pembayaran.");
    }

    localSubscriptionState = data.subscription;
    return data;
  },

  async cancel(
    reason?: string,
    token?: string | null
  ): Promise<{ success: boolean; subscription: SubscriptionStatusResponse; message: string }> {
    if (!token) {
      throw new Error("Pembatalan langganan memerlukan koneksi ke server akun.");
    }

    const res = await fetch(`${API_BASE_URL}/subscription/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    if (res.status === 401) {
      await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
      throw new Error("Sesi telah berakhir. Silakan masuk kembali.");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Gagal membatalkan perpanjangan otomatis.");
    }

    localSubscriptionState = data.subscription;
    return data;
  },

  async restore(
    provider: BillingProvider = "stripe",
    token?: string | null
  ): Promise<{ restored: boolean; statusResponse: SubscriptionStatusResponse; message: string }> {
    if (!token) {
      throw new Error("Pemulihan langganan memerlukan sesi akun yang aktif.");
    }

    const res = await fetch(`${API_BASE_URL}/subscription/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider }),
    });

    if (res.status === 401) {
      await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
      throw new Error("Sesi telah berakhir. Silakan masuk kembali.");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Gagal memulihkan riwayat langganan dari server.");
    }

    if (data.restored && data.statusResponse) {
      localSubscriptionState = data.statusResponse;
    }
    return data;
  },
};
