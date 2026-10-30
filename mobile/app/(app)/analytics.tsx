import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Card, Badge, Button } from "@/components/ui";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import {
  DateRangeOption,
  DailyAnalyticsPoint,
  formatIdr,
  formatGrams,
  getAdherenceBadge,
  buildAccessibleDayDescription,
} from "@/lib/analyticsDomain";
import {
  CrownIconSvg,
  ChevronLeftIconSvg,
  CalendarIconSvg,
  BarChartIconSvg,
  RefreshIconSvg,
  CheckIconSvg,
  LeafIconSvg,
  BrandImages,
} from "@/constants/Assets";

export default function AnalyticsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const {
    range,
    analyticsData,
    selectedPoint,
    isLoading,
    error,
    setRange,
    setSelectedPoint,
    fetchAnalytics,
    exportReport,
  } = useAnalyticsStore();

  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const handleExport = async (format: "csv" | "json") => {
    try {
      setExporting(true);
      const res = await exportReport(format);
      const msg =
        format === "csv"
          ? "Nutrition data export generated in CSV format."
          : "Nutrition data export generated in JSON format.";

      if (Platform.OS === "web") {
        if (format === "csv" && typeof res === "string") {
          const blob = new Blob([res], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `better_life_nutrition_${range}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      setExportNotice(msg);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      Alert.alert("Export Failed", "Unable to export nutrition records right now.");
    } finally {
      setExporting(false);
    }
  };

  // If user does not have Premium entitlement, display clean upgrade gate
  if (!isPremium) {
    return (
      <ScreenWrapper noPadding={true} testID="analytics-screen-locked">
        <View className="flex-1 bg-[#faf9f5]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-[#eae8e1] bg-white">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-[#faf9f5] border border-[#eae8e1] items-center justify-center active:bg-[#eae8e1]"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeftIconSvg size={20} color="#153e28" />
            </TouchableOpacity>
            <AppText weight="bold" className="text-base text-neutral-dark">
              Advanced Analytics
            </AppText>
            <View className="w-10" />
          </View>

          <View className="flex-1 items-center justify-center p-6 max-w-md mx-auto">
            <View className="w-16 h-16 rounded-2xl bg-[#fef3c7] border border-[#fde68a] items-center justify-center mb-4">
              <CrownIconSvg size={32} color="#b45309" />
            </View>
            <AppText weight="black" className="text-xl text-neutral-dark text-center mb-2">
              Premium Nutrition Intelligence
            </AppText>
            <AppText weight="medium" className="text-sm text-neutral-muted text-center leading-relaxed mb-6">
              Unlock 7-day and 30-day calorie trends, macronutrient energy splits, logging consistency, and grocery spending metrics calculated from your real food journal.
            </AppText>

            <TouchableOpacity
              onPress={() => router.push("/(app)/upgrade")}
              className="w-full py-3.5 rounded-xl bg-[#153e28] active:bg-[#0f2e1d] items-center justify-center shadow-sm"
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Premium"
            >
              <AppText weight="bold" className="text-white text-base">
                Upgrade to Premium
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // Calculate chart max height scale
  const dailyTrends = analyticsData?.dailyTrends || [];
  const targetCalories = analyticsData?.summary.targetCalories || 2000;
  const maxCaloriesInTrend = Math.max(
    targetCalories * 1.25,
    ...dailyTrends.map((p) => p.calories)
  );

  return (
    <ScreenWrapper noPadding={true} testID="analytics-screen">
      <ScrollView
        className="flex-1 bg-[#faf9f5]"
        contentContainerStyle={{ paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View className="px-5 pt-4 pb-4 bg-white border-b border-[#eae8e1]">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-[#faf9f5] border border-[#eae8e1] items-center justify-center active:bg-[#eae8e1]"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeftIconSvg size={20} color="#153e28" />
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              <Image
                source={BrandImages.logoPng}
                style={{ width: 26, height: 26 }}
                resizeMode="contain"
                accessibilityLabel="Better Life Logo"
              />
              <AppText weight="black" className="text-lg text-neutral-dark">
                Nutrition Analytics
              </AppText>
              <Badge label="Premium" variant="primary" />
            </View>

            <TouchableOpacity
              onPress={() => fetchAnalytics()}
              disabled={isLoading}
              className="w-10 h-10 rounded-xl bg-[#faf9f5] border border-[#eae8e1] items-center justify-center active:bg-[#eae8e1]"
              accessibilityRole="button"
              accessibilityLabel="Refresh analytics data"
            >
              <RefreshIconSvg size={18} color="#153e28" />
            </TouchableOpacity>
          </View>

          {/* Range Selector Pills (7 Days vs 30 Days) */}
          <View className="flex-row items-center justify-between gap-2 pt-1">
            <View className="flex-1 flex-row bg-[#f4f3ed] p-1 rounded-xl border border-[#eae8e1]">
              <TouchableOpacity
                onPress={() => setRange("7d")}
                className={`flex-1 py-2 rounded-lg items-center justify-center transition-all ${
                  range === "7d" ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#eae8e1]" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel="View 7-day trend"
              >
                <AppText
                  weight="bold"
                  className={`text-xs ${range === "7d" ? "text-primary" : "text-neutral-muted"}`}
                >
                  7 Days
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRange("30d")}
                className={`flex-1 py-2 rounded-lg items-center justify-center transition-all ${
                  range === "30d" ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#eae8e1]" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel="View 30-day trend"
              >
                <AppText
                  weight="bold"
                  className={`text-xs ${range === "30d" ? "text-primary" : "text-neutral-muted"}`}
                >
                  30 Days
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Export Action */}
            <TouchableOpacity
              onPress={() => handleExport("csv")}
              disabled={exporting}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-[#eae8e1] active:bg-[#f4f3ed] flex-row items-center gap-1.5"
              accessibilityRole="button"
              accessibilityLabel="Export nutrition data as CSV"
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#153e28" />
              ) : (
                <>
                  <BarChartIconSvg size={14} color="#153e28" />
                  <AppText weight="bold" className="text-xs text-neutral-dark">
                    Export CSV
                  </AppText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {exportNotice && (
            <View className="mt-3 p-2.5 bg-[#eaf2ec] border border-[#d6e4db] rounded-lg flex-row items-center gap-2">
              <CheckIconSvg size={14} color="#153e28" />
              <AppText weight="semibold" className="text-xs text-[#153e28] flex-1">
                {exportNotice}
              </AppText>
            </View>
          )}
        </View>

        {isLoading && !analyticsData ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#153e28" />
            <AppText weight="medium" className="text-xs text-neutral-muted mt-3">
              Computing nutrition trends...
            </AppText>
          </View>
        ) : error ? (
          <View className="p-6 m-4 bg-white rounded-2xl border border-red-200 items-center">
            <AppText weight="bold" className="text-sm text-red-700 mb-1">
              Error Loading Analytics
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted text-center mb-4">
              {error}
            </AppText>
            <Button title="Try Again" size="sm" onPress={() => fetchAnalytics()} />
          </View>
        ) : (
          <View className="p-4 sm:p-6 gap-y-5 max-w-4xl mx-auto w-full">
            {/* 1. Target Comparison & Adherence Summary Card */}
            <View className="bg-white rounded-2xl border border-[#eae8e1] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <View className="flex-row items-center justify-between pb-3 border-b border-[#f4f2ec]">
                <View>
                  <AppText weight="bold" className="text-xs text-neutral-muted uppercase tracking-wider">
                    Average Daily Intake
                  </AppText>
                  <View className="flex-row items-baseline gap-2 mt-0.5">
                    <AppText
                      weight="black"
                      className="text-2xl text-neutral-dark"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {analyticsData?.summary.averageDailyCalories.toLocaleString("id-ID")}
                    </AppText>
                    <AppText weight="medium" className="text-xs text-neutral-muted">
                      / {targetCalories.toLocaleString("id-ID")} kcal target
                    </AppText>
                  </View>
                </View>

                {/* Calorie Delta / Status Pill */}
                {(() => {
                  const delta = analyticsData?.summary.targetComparison.deltaKcal || 0;
                  const isSurplus = delta > 0;
                  return (
                    <View
                      className={`px-3 py-1.5 rounded-full border ${
                        Math.abs(delta) <= targetCalories * 0.1
                          ? "bg-[#eaf2ec] border-[#d6e4db]"
                          : isSurplus
                          ? "bg-[#fffbeb] border-[#fde68a]"
                          : "bg-[#eff6ff] border-[#bfdbfe]"
                      }`}
                    >
                      <AppText
                        weight="bold"
                        className={`text-xs ${
                          Math.abs(delta) <= targetCalories * 0.1
                            ? "text-[#153e28]"
                            : isSurplus
                            ? "text-[#b45309]"
                            : "text-[#1d4ed8]"
                        }`}
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {delta > 0 ? `+${delta}` : delta} kcal delta
                      </AppText>
                    </View>
                  );
                })()}
              </View>

              {/* 3 Metric Pills */}
              <View className="flex-row gap-3 pt-3">
                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                    Adherence Score
                  </AppText>
                  <AppText
                    weight="black"
                    className="text-lg text-primary mt-0.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {analyticsData?.summary.adherenceScore}%
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Target calibration
                  </AppText>
                </View>

                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                    Dietary Fiber
                  </AppText>
                  <AppText weight="black" className="text-lg text-neutral-dark mt-0.5">
                    {analyticsData?.summary.fiberScore}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    25g daily standard
                  </AppText>
                </View>

                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                    Logged Days
                  </AppText>
                  <AppText
                    weight="black"
                    className="text-lg text-neutral-dark mt-0.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {analyticsData?.consistency.loggedDaysCount} / {analyticsData?.consistency.totalDaysInRange}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    {analyticsData?.consistency.dataCoveragePercentage}% coverage
                  </AppText>
                </View>
              </View>
            </View>

            {/* 2. Calorie Trend Bar Chart */}
            <View className="bg-white rounded-2xl border border-[#eae8e1] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <View className="flex-row items-center justify-between pb-2 mb-2">
                <View>
                  <AppText weight="bold" className="text-base text-neutral-dark">
                    Daily Calorie Trend
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Tap a day to inspect entries & macro breakdown
                  </AppText>
                </View>

                {/* Target Legend Line */}
                <View className="flex-row items-center gap-1.5">
                  <View className="w-4 h-0.5 bg-[#b45309]" />
                  <AppText weight="semibold" className="text-[11px] text-neutral-muted">
                    Target: {targetCalories} kcal
                  </AppText>
                </View>
              </View>

              {/* Accessible narrative for screen readers */}
              <View
                accessibilityRole="summary"
                accessibilityLabel={`Calorie trend for ${range}. ${analyticsData?.narrative}`}
                className="sr-only"
              >
                <AppText weight="regular" className="text-xs text-transparent h-0">
                  {analyticsData?.narrative}
                </AppText>
              </View>

              {/* Horizontal Scrollable Bar Chart Container */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 12, minWidth: "100%" }}
                className="overflow-visible"
              >
                <View className="flex-row items-end gap-2.5 h-44 pb-6 pt-2 border-b border-[#eae8e1] relative flex-1 justify-between">
                  {/* Dashed Target Line */}
                  <View
                    style={{
                      bottom: 24 + ((targetCalories / maxCaloriesInTrend) * 120),
                      left: 0,
                      right: 0,
                    }}
                    className="absolute h-[1px] border-b border-dashed border-[#b45309] z-0 opacity-70"
                  />

                  {dailyTrends.map((pt) => {
                    const isSelected = selectedPoint?.date === pt.date;
                    const barHeightPct = pt.hasData
                      ? Math.max(8, Math.min(100, Math.round((pt.calories / maxCaloriesInTrend) * 100)))
                      : 4;

                    const barColor = !pt.hasData
                      ? "#eae8e1"
                      : pt.adherenceStatus === "on_target"
                      ? "#1b7a53"
                      : pt.adherenceStatus === "over_target"
                      ? "#b45309"
                      : "#2563eb";

                    return (
                      <TouchableOpacity
                        key={pt.date}
                        onPress={() => setSelectedPoint(pt)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={buildAccessibleDayDescription(pt)}
                        className="items-center justify-end h-full flex-1 min-w-[28px] max-w-[48px] z-10"
                      >
                        {/* Day Calorie Value Tooltip on Selection */}
                        {isSelected && pt.hasData && (
                          <View className="absolute -top-6 px-1.5 py-0.5 rounded bg-neutral-dark items-center justify-center shadow-xs">
                            <AppText
                              weight="bold"
                              className="text-[9px] text-white"
                              style={{ fontVariant: ["tabular-nums"] }}
                            >
                              {pt.calories}
                            </AppText>
                          </View>
                        )}

                        {/* Bar Pillar */}
                        <View
                          style={{
                            height: `${barHeightPct}%`,
                            backgroundColor: barColor,
                          }}
                          className={`w-full rounded-t-md transition-all ${
                            isSelected ? "ring-2 ring-neutral-dark" : "opacity-90"
                          } ${!pt.hasData ? "border-t border-dashed border-[#d6d3c9]" : ""}`}
                        />

                        {/* Day Label */}
                        <View className="absolute -bottom-5 items-center">
                          <AppText
                            weight={isSelected ? "bold" : "medium"}
                            className={`text-[10px] ${
                              isSelected ? "text-primary font-bold" : "text-neutral-muted"
                            }`}
                          >
                            {pt.dayLabel.split(" ")[0]}
                          </AppText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Chart Legend */}
              <View className="flex-row items-center justify-center gap-4 pt-4 flex-wrap">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#1b7a53]" />
                  <AppText weight="medium" className="text-[11px] text-neutral-muted">
                    On Target (±15%)
                  </AppText>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                  <AppText weight="medium" className="text-[11px] text-neutral-muted">
                    Under Target
                  </AppText>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#b45309]" />
                  <AppText weight="medium" className="text-[11px] text-neutral-muted">
                    Above Target
                  </AppText>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#eae8e1]" />
                  <AppText weight="medium" className="text-[11px] text-neutral-muted">
                    No Data Logged
                  </AppText>
                </View>
              </View>
            </View>

            {/* 3. Selected Day Detailed Inspector */}
            {selectedPoint && (
              <View className="bg-white rounded-2xl border border-[#eae8e1] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <View className="flex-row items-center justify-between pb-3 border-b border-[#f4f2ec]">
                  <View className="flex-row items-center gap-2">
                    <CalendarIconSvg size={16} color="#153e28" />
                    <AppText weight="bold" className="text-sm text-neutral-dark">
                      {selectedPoint.dayLabel} ({selectedPoint.date})
                    </AppText>
                  </View>

                  {/* Badge */}
                  {(() => {
                    const badge = getAdherenceBadge(selectedPoint.adherenceStatus);
                    return (
                      <View
                        style={{ backgroundColor: badge.bgColor, borderColor: badge.borderColor }}
                        className="px-2.5 py-1 rounded-full border"
                      >
                        <AppText weight="bold" style={{ color: badge.textColor }} className="text-[11px]">
                          {badge.label}
                        </AppText>
                      </View>
                    );
                  })()}
                </View>

                {selectedPoint.hasData ? (
                  <View className="pt-3 gap-y-3">
                    {/* Day Macro Stats Strip */}
                    <View className="flex-row items-center justify-between p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                      <View className="items-center flex-1">
                        <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                          Calories
                        </AppText>
                        <AppText
                          weight="black"
                          className="text-sm text-primary mt-0.5"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {selectedPoint.calories} kcal
                        </AppText>
                      </View>
                      <View className="w-[1px] h-6 bg-[#eae8e1]" />
                      <View className="items-center flex-1">
                        <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                          Protein
                        </AppText>
                        <AppText
                          weight="bold"
                          className="text-sm text-neutral-dark mt-0.5"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {formatGrams(selectedPoint.proteinGrams)}
                        </AppText>
                      </View>
                      <View className="w-[1px] h-6 bg-[#eae8e1]" />
                      <View className="items-center flex-1">
                        <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                          Carbs
                        </AppText>
                        <AppText
                          weight="bold"
                          className="text-sm text-neutral-dark mt-0.5"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {formatGrams(selectedPoint.carbsGrams)}
                        </AppText>
                      </View>
                      <View className="w-[1px] h-6 bg-[#eae8e1]" />
                      <View className="items-center flex-1">
                        <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                          Fat
                        </AppText>
                        <AppText
                          weight="bold"
                          className="text-sm text-neutral-dark mt-0.5"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {formatGrams(selectedPoint.fatGrams)}
                        </AppText>
                      </View>
                    </View>

                    {/* Meal entries logged for this day */}
                    <View>
                      <AppText weight="bold" className="text-xs text-neutral-dark mb-2">
                        Logged Meals ({selectedPoint.meals.length})
                      </AppText>
                      <View className="gap-y-2">
                        {selectedPoint.meals.map((meal) => (
                          <View
                            key={meal.id}
                            className="p-2.5 rounded-xl bg-[#faf9f5] border border-[#eae8e1] flex-row items-center justify-between"
                          >
                            <View className="flex-1 pr-2">
                              <AppText weight="bold" className="text-xs text-neutral-dark">
                                {meal.name}
                              </AppText>
                              <AppText weight="medium" className="text-[11px] text-neutral-muted">
                                {meal.type}
                              </AppText>
                            </View>

                            <View className="items-end">
                              <AppText
                                weight="bold"
                                className="text-xs text-primary"
                                style={{ fontVariant: ["tabular-nums"] }}
                              >
                                {meal.calories} kcal
                              </AppText>
                              {meal.estimatedCostIdr ? (
                                <AppText
                                  weight="medium"
                                  className="text-[10px] text-neutral-muted"
                                  style={{ fontVariant: ["tabular-nums"] }}
                                >
                                  {formatIdr(meal.estimatedCostIdr)}
                                </AppText>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="py-6 items-center justify-center">
                    <AppText weight="bold" className="text-xs text-neutral-dark mb-1">
                      No journal entries for this day
                    </AppText>
                    <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs">
                      Meals were not tracked for {selectedPoint.dayLabel}. This is kept distinct from zero intake to prevent skewed averages.
                    </AppText>
                  </View>
                )}
              </View>
            )}

            {/* 4. Macronutrient Distribution & Trends */}
            <View className="bg-white rounded-2xl border border-[#eae8e1] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <View className="flex-row items-center justify-between pb-3 border-b border-[#f4f2ec] mb-3">
                <View>
                  <AppText weight="bold" className="text-base text-neutral-dark">
                    Macronutrient Energy Distribution
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Caloric contribution across total logged food
                  </AppText>
                </View>

                <View className="flex-row items-center gap-1">
                  <LeafIconSvg size={16} color="#153e28" />
                  <AppText weight="bold" className="text-xs text-primary">
                    Balanced Split
                  </AppText>
                </View>
              </View>

              {/* Stacked Energy Bar */}
              <View className="mb-4">
                <View className="flex-row justify-between text-xs mb-1.5">
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Protein: {analyticsData?.macroDistribution.proteinPercentage}% • Carbs: {analyticsData?.macroDistribution.carbsPercentage}% • Fat: {analyticsData?.macroDistribution.fatPercentage}%
                  </AppText>
                </View>
                <View className="h-3.5 rounded-full bg-[#f4f3ed] flex-row overflow-hidden border border-[#eae8e1]">
                  <View
                    style={{ width: `${analyticsData?.macroDistribution.proteinPercentage || 25}%` }}
                    className="bg-emerald-600 h-full"
                  />
                  <View
                    style={{ width: `${analyticsData?.macroDistribution.carbsPercentage || 50}%` }}
                    className="bg-amber-500 h-full"
                  />
                  <View
                    style={{ width: `${analyticsData?.macroDistribution.fatPercentage || 25}%` }}
                    className="bg-rose-500 h-full"
                  />
                </View>
              </View>

              {/* 3 Macro Cards */}
              <View className="flex-row gap-2.5">
                {/* Protein */}
                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <View className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <AppText weight="bold" className="text-xs text-neutral-dark">
                      Protein
                    </AppText>
                  </View>
                  <AppText
                    weight="black"
                    className="text-base text-neutral-dark"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatGrams(analyticsData?.macroDistribution.grams.protein || 0)}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Target: {formatGrams(analyticsData?.macroDistribution.targetGrams.protein || 0)}
                  </AppText>
                </View>

                {/* Carbs */}
                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <AppText weight="bold" className="text-xs text-neutral-dark">
                      Carbs
                    </AppText>
                  </View>
                  <AppText
                    weight="black"
                    className="text-base text-neutral-dark"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatGrams(analyticsData?.macroDistribution.grams.carbs || 0)}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Target: {formatGrams(analyticsData?.macroDistribution.targetGrams.carbs || 0)}
                  </AppText>
                </View>

                {/* Fat */}
                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <View className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <AppText weight="bold" className="text-xs text-neutral-dark">
                      Fats
                    </AppText>
                  </View>
                  <AppText
                    weight="black"
                    className="text-base text-neutral-dark"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatGrams(analyticsData?.macroDistribution.grams.fat || 0)}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Target: {formatGrams(analyticsData?.macroDistribution.targetGrams.fat || 0)}
                  </AppText>
                </View>
              </View>
            </View>

            {/* 5. Logging Consistency & Meal Frequency */}
            <View className="bg-white rounded-2xl border border-[#eae8e1] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <View className="pb-3 border-b border-[#f4f2ec] mb-3">
                <AppText weight="bold" className="text-base text-neutral-dark">
                  Logging Consistency & Meal Timing
                </AppText>
                <AppText weight="medium" className="text-xs text-neutral-muted">
                  Habit streak and meal distribution patterns
                </AppText>
              </View>

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                    Current Streak
                  </AppText>
                  <AppText
                    weight="black"
                    className="text-lg text-primary mt-0.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {analyticsData?.consistency.currentStreakDays} days
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Active streak
                  </AppText>
                </View>

                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                    Meals per Day
                  </AppText>
                  <AppText
                    weight="black"
                    className="text-lg text-neutral-dark mt-0.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {analyticsData?.consistency.averageMealsPerLoggedDay}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    {analyticsData?.consistency.totalMealsLogged} total meals
                  </AppText>
                </View>
              </View>

              {/* Meal Slot Distribution Bars */}
              <View className="gap-y-2">
                <AppText weight="bold" className="text-xs text-neutral-dark">
                  Meal Slot Distribution
                </AppText>
                {(() => {
                  const slots = [
                    { label: "Breakfast", pct: analyticsData?.consistency.mealTimingDistribution.breakfastPercentage || 0, color: "bg-amber-500" },
                    { label: "Lunch", pct: analyticsData?.consistency.mealTimingDistribution.lunchPercentage || 0, color: "bg-emerald-600" },
                    { label: "Dinner", pct: analyticsData?.consistency.mealTimingDistribution.dinnerPercentage || 0, color: "bg-indigo-600" },
                    { label: "Snacks", pct: analyticsData?.consistency.mealTimingDistribution.snacksPercentage || 0, color: "bg-rose-500" },
                  ];

                  return slots.map((s) => (
                    <View key={s.label} className="flex-row items-center justify-between gap-3">
                      <AppText weight="medium" className="text-xs text-neutral-dark w-16">
                        {s.label}
                      </AppText>
                      <View className="flex-1 h-2 rounded-full bg-[#f4f3ed] overflow-hidden border border-[#eae8e1]">
                        <View style={{ width: `${s.pct}%` }} className={`h-full ${s.color}`} />
                      </View>
                      <AppText
                        weight="bold"
                        className="text-xs text-neutral-muted w-10 text-right"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {s.pct}%
                      </AppText>
                    </View>
                  ));
                })()}
              </View>
            </View>

            {/* 6. Estimated Grocery & Food Spending */}
            <View className="bg-white rounded-2xl border border-[#eae8e1] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <View className="flex-row items-center justify-between pb-3 border-b border-[#f4f2ec] mb-3">
                <View>
                  <AppText weight="bold" className="text-base text-neutral-dark">
                    Estimated Spending Trends
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Based on regional Indonesian ingredient cost benchmarks
                  </AppText>
                </View>

                <View className="px-2.5 py-1 rounded-full bg-[#eaf2ec] border border-[#d6e4db]">
                  <AppText weight="bold" className="text-[10px] text-[#153e28]">
                    {analyticsData?.spending.pricingCoveragePct}% priced
                  </AppText>
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                    Total Estimated
                  </AppText>
                  <AppText
                    weight="black"
                    className="text-base text-primary mt-0.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatIdr(analyticsData?.spending.totalEstimatedCostIdr || 0)}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Across {range}
                  </AppText>
                </View>

                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                    Daily Average
                  </AppText>
                  <AppText
                    weight="black"
                    className="text-base text-neutral-dark mt-0.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatIdr(analyticsData?.spending.averageDailyCostIdr || 0)}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Per active day
                  </AppText>
                </View>

                <View className="flex-1 p-3 rounded-xl bg-[#faf9f5] border border-[#eae8e1]">
                  <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                    Cost per Meal
                  </AppText>
                  <AppText
                    weight="black"
                    className="text-base text-neutral-dark mt-0.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatIdr(analyticsData?.spending.averageCostPerMealIdr || 0)}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Priced entries
                  </AppText>
                </View>
              </View>
            </View>

            {/* 7. Clinical Narrative & Recommendations */}
            <View className="bg-white rounded-2xl border border-[#eae8e1] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <AppText weight="bold" className="text-base text-neutral-dark mb-1">
                Clinical Summary & Guidance
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted leading-relaxed mb-4">
                {analyticsData?.narrative}
              </AppText>

              <View className="gap-y-2 pt-2 border-t border-[#f4f2ec]">
                {analyticsData?.insights.map((insight, idx) => (
                  <View key={idx} className="flex-row items-start gap-2">
                    <View className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <AppText weight="medium" className="text-xs text-neutral-dark flex-1 leading-relaxed">
                      {insight}
                    </AppText>
                  </View>
                ))}
              </View>

              {/* Data Integrity Footer Notice */}
              <View className="mt-4 pt-3 border-t border-[#f4f2ec]">
                <AppText weight="regular" className="text-[11px] text-neutral-muted italic text-center">
                  {analyticsData?.disclaimer}
                </AppText>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
