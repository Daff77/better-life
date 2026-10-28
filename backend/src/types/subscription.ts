export type MembershipTier = "free" | "premium";

export type SubscriptionStatus =
  | "free"
  | "pending_verification"
  | "premium_active"
  | "canceled"
  | "expired"
  | "payment_failed"
  | "revoked";

export type BillingProvider =
  | "stripe"
  | "apple_app_store"
  | "google_play"
  | "mock_sandbox"
  | "manual";

export type PlanId = "monthly" | "annual" | "lifetime";

export const Entitlement = {
  // Free tier entitlements (core features available to all users)
  FOOD_LOGGING: "FOOD_LOGGING",
  BASIC_NUTRITION: "BASIC_NUTRITION",
  STANDARD_RECIPES: "STANDARD_RECIPES",
  BASIC_DASHBOARD: "BASIC_DASHBOARD",
  BASIC_HISTORY: "BASIC_HISTORY",

  // Premium tier entitlements (advanced value additions)
  ADVANCED_ANALYTICS: "ADVANCED_ANALYTICS",
  NUTRITION_REPORTS: "NUTRITION_REPORTS",
  EXPORT_REPORTS: "EXPORT_REPORTS",
  PERSONALIZED_MEAL_PLAN: "PERSONALIZED_MEAL_PLAN",
  BUDGET_RECOMMENDATIONS: "BUDGET_RECOMMENDATIONS",
  PREMIUM_RECIPES: "PREMIUM_RECIPES",
  ADVANCED_TRENDS: "ADVANCED_TRENDS",
} as const;

export type Entitlement = (typeof Entitlement)[keyof typeof Entitlement];

export const FREE_ENTITLEMENTS: readonly Entitlement[] = [
  Entitlement.FOOD_LOGGING,
  Entitlement.BASIC_NUTRITION,
  Entitlement.STANDARD_RECIPES,
  Entitlement.BASIC_DASHBOARD,
  Entitlement.BASIC_HISTORY,
] as const;

export const PREMIUM_ENTITLEMENTS: readonly Entitlement[] = [
  ...FREE_ENTITLEMENTS,
  Entitlement.ADVANCED_ANALYTICS,
  Entitlement.NUTRITION_REPORTS,
  Entitlement.EXPORT_REPORTS,
  Entitlement.PERSONALIZED_MEAL_PLAN,
  Entitlement.BUDGET_RECOMMENDATIONS,
  Entitlement.PREMIUM_RECIPES,
  Entitlement.ADVANCED_TRENDS,
] as const;

export const TIER_ENTITLEMENTS: Record<MembershipTier, readonly Entitlement[]> = {
  free: FREE_ENTITLEMENTS,
  premium: PREMIUM_ENTITLEMENTS,
};

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  badge?: string;
  interval: "month" | "year" | "lifetime";
  currency: string;
  priceAmount: number;
  formattedPrice: string;
  savingsPercentage?: number;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  monthly: {
    id: "monthly",
    name: "Monthly Membership",
    interval: "month",
    currency: "IDR",
    priceAmount: 49000,
    formattedPrice: "Rp 49.000 / month",
    description: "Flexible month-to-month access to all premium nutrition tools.",
    features: [
      "Advanced macronutrient and micronutrient analytics",
      "Weekly and monthly nutrition reports",
      "Personalized daily meal schedule generator",
      "Budget-aware meal recommendations",
      "Exclusive chef-curated premium recipe catalog",
      "Exportable nutrition report data",
    ],
  },
  annual: {
    id: "annual",
    name: "Annual Membership",
    badge: "Save 32%",
    interval: "year",
    currency: "IDR",
    priceAmount: 399000,
    formattedPrice: "Rp 399.000 / year",
    savingsPercentage: 32,
    description: "Best value. Equivalent to Rp 33.250 / month, billed annually.",
    features: [
      "Everything in Monthly",
      "Save 32% compared to monthly billing",
      "Priority feature access and updates",
      "Long-term trend history and data exports",
    ],
  },
  lifetime: {
    id: "lifetime",
    name: "Lifetime Wellness",
    badge: "One-time",
    interval: "lifetime",
    currency: "IDR",
    priceAmount: 999000,
    formattedPrice: "Rp 999.000 one-time",
    description: "Pay once, keep full premium nutrition features permanently.",
    features: [
      "Unlimited lifetime access to all current and future premium features",
      "Zero recurring subscription fees",
      "VIP customer support",
    ],
  },
};

export interface SubscriptionRecord {
  id: string;
  userId: string;
  tier: MembershipTier;
  status: SubscriptionStatus;
  planId?: PlanId | null;
  billingProvider: BillingProvider;
  externalSubscriptionId?: string | null;
  externalCustomerId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentEventRecord {
  id: string;
  eventId: string;
  provider: BillingProvider;
  eventType: string;
  userId?: string | null;
  subscriptionId?: string | null;
  payload: Record<string, any>;
  processedAt: Date;
}

export interface SubscriptionStatusResponse {
  tier: MembershipTier;
  status: SubscriptionStatus;
  isPremium: boolean;
  planId?: PlanId | null;
  billingProvider?: BillingProvider | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: readonly Entitlement[];
  gracePeriodEndsAt?: string | null;
}
