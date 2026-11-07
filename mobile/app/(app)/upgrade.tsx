import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Card, Badge, Button } from "@/components/ui";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  PlanId,
  SUBSCRIPTION_PLANS,
  getStatusDisplayLabel,
} from "@/lib/subscriptionDomain";
import {
  IconRenderer,
  CrownIconSvg,
  CheckIconSvg,
  CloseIconSvg,
  ChevronLeftIconSvg,
  LeafIconSvg,
  BrandImages,
} from "@/constants/Assets";

export default function UpgradeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const user = useAuthStore((state) => state.user);
  const {
    tier,
    status,
    isPremium,
    planId: activePlanId,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    isLoading,
    isUpgrading,
    error,
    fetchStatus,
    upgradePlan,
    cancelSubscription,
    restorePurchases,
  } = useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>("annual");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const statusInfo = getStatusDisplayLabel(status, cancelAtPeriodEnd);

  const handleUpgrade = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await upgradePlan(selectedPlan, "mock_sandbox");
    if (result.success) {
      setSuccessMessage(
        `Your membership has been upgraded to ${SUBSCRIPTION_PLANS[selectedPlan].name}.`
      );
    } else {
      setErrorMessage(result.error || "Unable to complete upgrade. Please try again.");
    }
  };

  const handleCancelAutoRenew = async () => {
    setCancelModalVisible(false);
    setErrorMessage(null);
    const result = await cancelSubscription("User requested cancellation via settings");
    if (result.success) {
      setSuccessMessage("Auto-renewal has been canceled. Your access remains active until your current period ends.");
    } else {
      setErrorMessage(result.error || "Could not cancel subscription.");
    }
  };

  const handleRestore = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const result = await restorePurchases();
    if (result.restored) {
      setSuccessMessage(result.message);
    } else {
      Alert.alert("Restore Purchases", result.message);
    }
  };

  // Feature comparison matrix
  const COMPARISON_ROWS = [
    {
      feature: "Daily food and calorie logging",
      free: "Included",
      premium: "Included",
    },
    {
      feature: "Macronutrient target tracking",
      free: "Basic",
      premium: "Advanced",
    },
    {
      feature: "Healthy recipe catalog",
      free: "Standard recipes",
      premium: "Full + Chef collections",
    },
    {
      feature: "Macro distribution & adherence analysis",
      free: false,
      premium: true,
    },
    {
      feature: "Weekly and monthly nutrition reports",
      free: false,
      premium: true,
    },
    {
      feature: "Personalized daily meal schedule generator",
      free: false,
      premium: true,
    },
    {
      feature: "Budget-aware meal recommendations",
      free: false,
      premium: true,
    },
    {
      feature: "Exportable nutrition report data (CSV/JSON)",
      free: false,
      premium: true,
    },
  ];

  return (
    <ScreenWrapper maxWidth="full" noPadding className="flex-1 bg-[#faf9f5]">
      {/* Top Header */}
      <View className="w-full bg-[#faf9f5] border-b border-[#eae8e1] px-4 sm:px-6 lg:px-8 pt-3 pb-3.5 flex-row justify-between items-center">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#eef4f0] border border-[#d6e4db] items-center justify-center transition-transform active:scale-95"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeftIconSvg size={18} color="#153e28" />
          </TouchableOpacity>
          <Image
            source={BrandImages.logoPng}
            style={{ width: 34, height: 34 }}
            resizeMode="contain"
            accessibilityLabel="Better Life Logo"
          />
          <View>
            <AppText weight="bold" className="text-xl sm:text-2xl text-neutral-dark tracking-tight">
              Better Life Premium
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              Clinical nutrition tools calibrated for mindful wellness
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRestore}
          disabled={isLoading || isUpgrading}
          className="px-3 py-1.5 rounded-full bg-white border border-[#eae8e1] active:bg-[#f2f1eb]"
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
        >
          <AppText weight="semibold" className="text-xs text-neutral-dark">
            Restore Purchases
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 sm:px-6 lg:px-8 pt-4 bg-[#faf9f5]"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 64 : 112 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="max-w-[960px] mx-auto w-full">
          {/* Current Membership Status Banner */}
          <View className="mb-5 bg-white p-4 sm:p-5 rounded-2xl border border-[#eae8e1] shadow-xs">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-xl bg-[#eaf5ef] border border-[#d6e4db] items-center justify-center">
                  <CrownIconSvg size={22} color={isPremium ? "#b45309" : "#1b7a53"} />
                </View>
                <View>
                  <View className="flex-row items-center gap-2">
                    <AppText weight="bold" className="text-base text-neutral-dark">
                      Current Membership:
                    </AppText>
                    <Badge
                      label={statusInfo.label}
                      variant={
                        statusInfo.badgeVariant === "success"
                          ? "primary"
                          : statusInfo.badgeVariant === "warning"
                          ? "secondary"
                          : "outline"
                      }
                    />
                  </View>
                  <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                    {statusInfo.description}
                  </AppText>
                </View>
              </View>

              {currentPeriodEnd && (
                <View className="hidden sm:flex items-end">
                  <AppText weight="bold" className="text-[11px] text-neutral-muted uppercase">
                    {cancelAtPeriodEnd ? "Access Ends" : "Renews"}
                  </AppText>
                  <AppText
                    weight="bold"
                    className="text-xs text-neutral-dark"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {new Date(currentPeriodEnd).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </AppText>
                </View>
              )}
            </View>

            {/* Cancel Auto-Renew Notice if already active */}
            {isPremium && !cancelAtPeriodEnd && (
              <View className="mt-3 pt-3 border-t border-[#f4f2ec] flex-row justify-between items-center">
                <AppText weight="medium" className="text-xs text-neutral-muted">
                  Auto-renewal is active. You can cancel anytime without losing paid days.
                </AppText>
                <TouchableOpacity
                  onPress={() => setCancelModalVisible(true)}
                  className="px-3 py-1 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] active:bg-[#f3f4f6]"
                  accessibilityRole="button"
                  accessibilityLabel="Cancel auto-renewal"
                >
                  <AppText weight="bold" className="text-xs text-neutral-dark">
                    Manage Plan
                  </AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Feedback Banners */}
          {successMessage && (
            <View className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                <CheckIconSvg size={16} color="#059669" />
                <AppText weight="bold" className="text-xs text-emerald-800 flex-1">
                  {successMessage}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => setSuccessMessage(null)}
                className="w-6 h-6 items-center justify-center rounded-full"
              >
                <CloseIconSvg size={12} color="#059669" />
              </TouchableOpacity>
            </View>
          )}

          {errorMessage && (
            <View className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                <CloseIconSvg size={16} color="#e11d48" />
                <AppText weight="bold" className="text-xs text-rose-800 flex-1">
                  {errorMessage}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => setErrorMessage(null)}
                className="w-6 h-6 items-center justify-center rounded-full"
              >
                <CloseIconSvg size={12} color="#e11d48" />
              </TouchableOpacity>
            </View>
          )}

          {/* Value Proposition Header */}
          <View className="text-center mb-6 items-center">
            <View className="w-12 h-12 rounded-2xl bg-[#eaf5ef] border border-[#d6e4db] items-center justify-center mb-3">
              <LeafIconSvg size={24} color="#1b7a53" />
            </View>
            <AppText weight="bold" className="text-2xl sm:text-3xl text-neutral-dark text-center tracking-tight">
              Invest in Mindful Wellness
            </AppText>
            <AppText weight="medium" className="text-sm text-neutral-muted text-center max-w-lg mt-1 leading-relaxed">
              Unlock deep macro partitioning, weekly consistency reports, personalized meal planning, and exclusive chef collections.
            </AppText>
          </View>

          {/* Plan Selector Cards */}
          <View className="flex-col sm:flex-row gap-4 mb-6">
            {/* Annual Plan (Highlighted) */}
            <TouchableOpacity
              onPress={() => setSelectedPlan("annual")}
              activeOpacity={0.9}
              className={`flex-1 p-5 rounded-2xl border transition-all ${
                selectedPlan === "annual"
                  ? "bg-[#f4f9f6] border-primary shadow-xs"
                  : "bg-white border-[#eae8e1]"
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === "annual" }}
              accessibilityLabel="Select Annual Membership"
            >
              <View className="flex-row justify-between items-center mb-2">
                <AppText weight="bold" className="text-sm text-neutral-dark">
                  Annual Membership
                </AppText>
                <View className="px-2 py-0.5 rounded-full bg-[#1b7a53]/15 border border-[#1b7a53]/30">
                  <AppText weight="bold" className="text-[10px] text-primary">
                    Save 32%
                  </AppText>
                </View>
              </View>

              <AppText
                weight="black"
                className="text-2xl text-primary"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                Rp 399.000
                <AppText weight="medium" className="text-xs text-neutral-muted">
                  {" "}/ year
                </AppText>
              </AppText>

              <AppText
                weight="medium"
                className="text-xs text-neutral-muted mt-1"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                Equivalent to Rp 33.250 / month. Billed once annually.
              </AppText>

              <View className="mt-4 pt-3 border-t border-[#e2ece5] gap-1.5">
                <View className="flex-row items-center gap-2">
                  <CheckIconSvg size={14} color="#1b7a53" />
                  <AppText weight="medium" className="text-xs text-neutral-dark">
                    Full access to all premium features
                  </AppText>
                </View>
                <View className="flex-row items-center gap-2">
                  <CheckIconSvg size={14} color="#1b7a53" />
                  <AppText weight="medium" className="text-xs text-neutral-dark">
                    Best value for continuous health habits
                  </AppText>
                </View>
              </View>
            </TouchableOpacity>

            {/* Monthly Plan */}
            <TouchableOpacity
              onPress={() => setSelectedPlan("monthly")}
              activeOpacity={0.9}
              className={`flex-1 p-5 rounded-2xl border transition-all ${
                selectedPlan === "monthly"
                  ? "bg-[#f4f9f6] border-primary shadow-xs"
                  : "bg-white border-[#eae8e1]"
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === "monthly" }}
              accessibilityLabel="Select Monthly Membership"
            >
              <View className="flex-row justify-between items-center mb-2">
                <AppText weight="bold" className="text-sm text-neutral-dark">
                  Monthly Membership
                </AppText>
                <View className="px-2 py-0.5 rounded-full bg-[#f3f4f6] border border-[#e5e7eb]">
                  <AppText weight="bold" className="text-[10px] text-neutral-muted">
                    Flexible
                  </AppText>
                </View>
              </View>

              <AppText
                weight="black"
                className="text-2xl text-neutral-dark"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                Rp 49.000
                <AppText weight="medium" className="text-xs text-neutral-muted">
                  {" "}/ month
                </AppText>
              </AppText>

              <AppText weight="medium" className="text-xs text-neutral-muted mt-1">
                Month-to-month flexibility. Cancel anytime.
              </AppText>

              <View className="mt-4 pt-3 border-t border-[#e2ece5] gap-1.5">
                <View className="flex-row items-center gap-2">
                  <CheckIconSvg size={14} color="#1b7a53" />
                  <AppText weight="medium" className="text-xs text-neutral-dark">
                    Full access to all premium features
                  </AppText>
                </View>
                <View className="flex-row items-center gap-2">
                  <CheckIconSvg size={14} color="#1b7a53" />
                  <AppText weight="medium" className="text-xs text-neutral-dark">
                    No long-term commitment required
                  </AppText>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Primary Action Button */}
          <View className="mb-8">
            <Button
              variant="primary"
              size="lg"
              loading={isUpgrading}
              onPress={handleUpgrade}
              className="w-full min-h-[52px] rounded-xl"
              accessibilityLabel={`Upgrade to ${SUBSCRIPTION_PLANS[selectedPlan].name}`}
              title={
                isPremium
                  ? `Switch Plan to ${SUBSCRIPTION_PLANS[selectedPlan].name}`
                  : `Upgrade to ${SUBSCRIPTION_PLANS[selectedPlan].name}`
              }
            />
            <AppText weight="medium" className="text-center text-[11px] text-neutral-muted mt-2">
              Payment is verified securely on the backend. Cancel anytime in account settings.
            </AppText>
          </View>

          {/* Feature Comparison Table */}
          <View className="bg-white rounded-2xl border border-[#eae8e1] overflow-hidden mb-6 shadow-xs">
            <View className="px-5 py-4 bg-[#faf9f5] border-b border-[#eae8e1] flex-row justify-between items-center">
              <AppText weight="bold" className="text-sm text-neutral-dark">
                Membership Entitlements
              </AppText>
              <View className="flex-row gap-6 sm:gap-12">
                <AppText weight="bold" className="text-xs text-neutral-muted w-16 text-center">
                  Free
                </AppText>
                <AppText weight="bold" className="text-xs text-primary w-20 text-center">
                  Premium
                </AppText>
              </View>
            </View>

            <View className="divide-y divide-[#f4f2ec]">
              {COMPARISON_ROWS.map((row, index) => (
                <View
                  key={index}
                  className="px-5 py-3.5 flex-row justify-between items-center hover:bg-[#fbfbf9]"
                >
                  <AppText weight="medium" className="text-xs text-neutral-dark flex-1 pr-4">
                    {row.feature}
                  </AppText>
                  <View className="flex-row gap-6 sm:gap-12 items-center">
                    <View className="w-16 items-center justify-center">
                      {typeof row.free === "string" ? (
                        <AppText weight="medium" className="text-xs text-neutral-muted text-center">
                          {row.free}
                        </AppText>
                      ) : row.free ? (
                        <CheckIconSvg size={15} color="#1b7a53" />
                      ) : (
                        <CloseIconSvg size={14} color="#9ca3af" />
                      )}
                    </View>

                    <View className="w-20 items-center justify-center">
                      {typeof row.premium === "string" ? (
                        <AppText weight="bold" className="text-xs text-primary text-center">
                          {row.premium}
                        </AppText>
                      ) : row.premium ? (
                        <CheckIconSvg size={16} color="#1b7a53" />
                      ) : (
                        <CloseIconSvg size={14} color="#9ca3af" />
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Honest Subscription Terms */}
          <View className="p-4 bg-[#f4f3ed] rounded-xl border border-[#eae8e1] mb-8">
            <AppText weight="bold" className="text-xs text-neutral-dark mb-1">
              Transparent Subscription Policy:
            </AppText>
            <AppText weight="medium" className="text-[11px] text-neutral-muted leading-relaxed">
              Better Life does not use artificial countdowns, fabricated discounts, or hidden renewal charges. Your subscription renews automatically unless canceled at least 24 hours prior to the end of the current billing cycle. When canceled, your entitlement remains active through the end of the paid period without immediate data removal.
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Cancellation Confirmation Dialog */}
      {cancelModalVisible && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-6 z-50">
          <View className="w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-xl">
            <AppText weight="black" className="text-lg text-neutral-dark mb-2">
              Cancel Auto-Renewal?
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted leading-relaxed mb-5">
              You will continue to have full Premium access until your current billing period ends. Your logged meals, custom lists, and profile data will never be deleted.
            </AppText>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setCancelModalVisible(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-surface border border-neutral-border items-center justify-center"
                accessibilityRole="button"
              >
                <AppText weight="bold" className="text-xs text-neutral-dark">
                  Keep Plan
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCancelAutoRenew}
                className="flex-1 py-3 rounded-xl bg-status-error items-center justify-center"
                accessibilityRole="button"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Confirm Cancel
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}
