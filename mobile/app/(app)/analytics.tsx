import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AnimatedNumber,
  AppText,
  FadeInView,
  Header,
  PressableScale,
  Surface,
  CardHead,
  StatusPill,
  MixBar,
  ColorBlock,
  ListRow,
  RowIcon,
  Segmented,
  PillButton,
  RingButton,
  LineIcon,
  SkeletonPulse,
} from "@/components/ui";
import { MotionCurves, MotionDurations } from "@/constants/AnimationTokens";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useJournalStore, computeJournalAggregates } from "@/stores/useJournalStore";
import {
  DateRangeOption,
  formatIdr,
  formatGrams,
  getAdherenceBadge,
  buildAccessibleDayDescription,
} from "@/lib/analyticsDomain";
import { formatLocalDateKey, shiftCalendarDateKey } from "@better-life/shared";
import { analyticsApi, WeeklySummaryDigest } from "@/lib/api/analyticsApi";

const barEaseOut = Easing.bezier(...MotionCurves.out);

const AnimatedTrendBar: React.FC<{
  targetHeightPct: number;
  color: string;
  index: number;
}> = ({ targetHeightPct, color, index }) => {
  const reduceMotion = useReducedMotion();
  const heightPct = useSharedValue(reduceMotion ? targetHeightPct : 0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(heightPct);
      heightPct.value = targetHeightPct;
      return;
    }

    heightPct.value = withDelay(
      Math.min(index, 14) * 24,
      withTiming(targetHeightPct, {
        duration: MotionDurations.fill,
        easing: barEaseOut,
      })
    );
    return () => {
      cancelAnimation(heightPct);
    };
  }, [targetHeightPct, index, reduceMotion, heightPct]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${heightPct.value}%`,
  }));

  return (
    <Animated.View
      style={[
        {
          width: "100%",
          borderRadius: 8,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

const AnimatedTimingFill: React.FC<{
  targetPct: number;
  color: string;
}> = ({ targetPct, color }) => {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, targetPct));
  const widthPct = useSharedValue(reduceMotion ? clamped : 0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(widthPct);
      widthPct.value = clamped;
      return;
    }

    widthPct.value = withTiming(clamped, {
      duration: MotionDurations.fill,
      easing: barEaseOut,
    });
    return () => {
      cancelAnimation(widthPct);
    };
  }, [clamped, reduceMotion, widthPct]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));

  return (
    <Animated.View
      style={[
        {
          height: "100%",
          borderRadius: 999,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export default function AnalyticsScreen() {
  const router = useRouter();

  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const personalization = useOnboardingStore((state) => state.personalization);
  const savePersonalization = useOnboardingStore((state) => state.savePersonalization);
  const journals = useJournalStore((state) => state.journals);
  const activeDate = useJournalStore((state) => state.activeDate);

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
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklySummaryDigest | null>(null);

  const todayLocalKey = formatLocalDateKey();
  const [customStartInput, setCustomStartInput] = useState<string>(
    shiftCalendarDateKey(todayLocalKey, -6)
  );
  const [customEndInput, setCustomEndInput] = useState<string>(todayLocalKey);

  useEffect(() => {
    let active = true;
    analyticsApi
      .getWeeklySummary()
      .then((digest) => {
        if (active) setWeeklyDigest(digest);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [journals, personalization.targetCalories]);

  const currentWeight = personalization.weight || 65;
  const targetWeight = personalization.targetWeight || currentWeight;
  const weightDelta = Math.round((currentWeight - targetWeight) * 10) / 10;
  const isAtTargetWeight = Math.abs(weightDelta) <= 0.5;

  const handleAdjustWeight = async (deltaKg: number) => {
    const nextWeight = Math.max(30, Math.min(250, Math.round((currentWeight + deltaKg) * 10) / 10));
    await savePersonalization({ weight: nextWeight });
  };

  // Collect recent consumed meal history across journals
  const consumedHistory = Object.entries(journals)
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .flatMap(([dateKey, journal]) =>
      (journal.entries || []).map((entry) => ({
        ...entry,
        dateKey,
      }))
    )
    .slice(0, 8);

  const todayAggregates = computeJournalAggregates(
    journals[activeDate],
    personalization.targetCalories || 2000
  );

  const renderMonitoringOverview = () => (
    <View className="gap-4 mb-4">
      {/* 1. Monitoring Berat Badan & Target BB */}
      <Surface>
        <CardHead
          title="Monitoring berat badan & target"
          subtitle="Pantau progres menuju target berat badan ideal Anda"
          right={
            <StatusPill
              tone={isAtTargetWeight ? "ok" : "warn"}
              label={
                isAtTargetWeight
                  ? "Ideal tercapai"
                  : weightDelta > 0
                  ? `-${weightDelta} kg lagi`
                  : `+${Math.abs(weightDelta)} kg lagi`
              }
            />
          }
        />

        <View className="flex-row gap-3 mt-1">
          <View className="flex-1 bg-card-2 border border-line rounded-[18px] p-3.5">
            <AppText weight="medium" className="text-[11.5px] text-muted">
              Berat saat ini
            </AppText>
            <View className="flex-row items-baseline justify-between mt-1">
              <AppText
                weight="bold"
                className="text-[24px] text-ink"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {currentWeight}{" "}
                <AppText weight="semibold" className="text-[12px] text-muted">
                  kg
                </AppText>
              </AppText>
              <View className="flex-row items-center gap-1.5">
                <PressableScale
                  onPress={() => handleAdjustWeight(-0.5)}
                  className="w-7 h-7 rounded-full bg-card border border-line items-center justify-center"
                  accessibilityLabel="Kurangi berat 0.5 kg"
                >
                  <LineIcon name="minus" size={13} color="#121a16" />
                </PressableScale>
                <PressableScale
                  onPress={() => handleAdjustWeight(0.5)}
                  className="w-7 h-7 rounded-full bg-primary-light items-center justify-center"
                  accessibilityLabel="Tambah berat 0.5 kg"
                >
                  <LineIcon name="plus" size={13} color="#0e7a52" />
                </PressableScale>
              </View>
            </View>
          </View>

          <View className="flex-1 bg-card-2 border border-line rounded-[18px] p-3.5 justify-between">
            <AppText weight="medium" className="text-[11.5px] text-muted">
              Target berat badan
            </AppText>
            <View className="flex-row items-baseline justify-between mt-1">
              <AppText
                weight="bold"
                className="text-[24px] text-primary"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {targetWeight}{" "}
                <AppText weight="semibold" className="text-[12px] text-muted">
                  kg
                </AppText>
              </AppText>
              <AppText weight="semibold" className="text-[11.5px] text-muted">
                {personalization.height} cm
              </AppText>
            </View>
          </View>
        </View>

        <View className="mt-3.5 pt-3 border-t border-line flex-row items-center justify-between flex-wrap gap-2">
          <AppText weight="medium" className="text-[12px] text-muted">
            Asupan kalori hari ini:{" "}
            <AppText weight="bold" className="text-ink">
              {todayAggregates.totalConsumed.toLocaleString("id-ID")} /{" "}
              {todayAggregates.targetCalories.toLocaleString("id-ID")} kcal
            </AppText>
          </AppText>
          <AppText weight="semibold" className="text-[12px] text-primary-text">
            P {todayAggregates.totalProteinGrams}g · K {todayAggregates.totalCarbsGrams}g · L{" "}
            {todayAggregates.totalFatGrams}g
          </AppText>
        </View>
      </Surface>

      {/* 2. Ringkasan Mingguan dari Data Nyata */}
      {weeklyDigest && (
        <Surface>
          <CardHead
            title="Ringkasan mingguan (7 hari)"
            subtitle={`${weeklyDigest.startDate} sampai ${weeklyDigest.endDate} · dihitung dari catatan nyata`}
            right={
              <StatusPill
                tone={weeklyDigest.loggedDaysCount > 0 ? "ok" : "neutral"}
                label={`${weeklyDigest.loggedDaysCount}/7 hari tercatat`}
              />
            }
          />
          {weeklyDigest.loggedDaysCount === 0 ? (
            <AppText weight="regular" className="text-xs text-muted leading-relaxed">
              Belum ada makanan tercatat pada 7 hari terakhir. Tambahkan catatan makan harian Anda untuk melihat rata-rata kalori dan makronutrisi mingguan.
            </AppText>
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              <View className="flex-1 min-w-[110px] bg-card-2 border border-line rounded-[16px] p-3">
                <AppText weight="medium" className="text-[11px] text-muted">
                  Rata-rata kalori
                </AppText>
                <AppText
                  weight="bold"
                  className="text-[18px] text-ink mt-0.5"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {weeklyDigest.averageDailyCalories.toLocaleString("id-ID")} kcal
                </AppText>
              </View>
              <View className="flex-1 min-w-[110px] bg-card-2 border border-line rounded-[16px] p-3">
                <AppText weight="medium" className="text-[11px] text-muted">
                  Rata-rata makro
                </AppText>
                <AppText
                  weight="bold"
                  className="text-[13.5px] text-primary-text mt-1"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  P {weeklyDigest.averageProteinGrams}g · K {weeklyDigest.averageCarbsGrams}g · L {weeklyDigest.averageFatGrams}g
                </AppText>
              </View>
              <View className="flex-1 min-w-[100px] bg-card-2 border border-line rounded-[16px] p-3">
                <AppText weight="medium" className="text-[11px] text-muted">
                  Rentetan aktif
                </AppText>
                <AppText
                  weight="bold"
                  className="text-[18px] text-ink mt-0.5"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {weeklyDigest.currentStreakDays} hari
                </AppText>
              </View>
            </View>
          )}
        </Surface>
      )}

      {/* 3. Histori Menu yang Dikonsumsi */}
      <Surface>
        <CardHead
          title="Histori menu yang dikonsumsi"
          subtitle="Riwayat makanan dan minuman yang telah Anda catat"
          right={
            <PressableScale
              onPress={() => router.push("/(app)/(tabs)")}
              className="px-3 py-1.5 rounded-full bg-card-2 border border-line"
            >
              <AppText weight="bold" className="text-[11.5px] text-ink">
                Buka Jurnal
              </AppText>
            </PressableScale>
          }
        />

        {consumedHistory.length === 0 ? (
          <View className="py-5 items-center">
            <AppText weight="medium" className="text-[13px] text-muted text-center">
              Belum ada histori menu yang tercatat. Tambahkan makanan pertama Anda di Jurnal Harian.
            </AppText>
          </View>
        ) : (
          <View>
            {consumedHistory.map((item, idx) => (
              <ListRow
                key={`${item.dateKey}-${item.id}-${idx}`}
                first={idx === 0}
                last={idx === consumedHistory.length - 1}
                left={
                  <RowIcon tone="green">
                    <LineIcon name="utensils" size={15} color="#0e7a52" />
                  </RowIcon>
                }
                title={item.title}
                subtitle={`${item.category} · ${item.dateKey} · P ${item.proteinGrams ?? 0}g · K ${
                  item.carbsGrams ?? 0
                }g · L ${item.fatGrams ?? 0}g`}
                right={
                  <AppText
                    weight="bold"
                    className="text-[13px] text-ink"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {item.calories} kcal
                  </AppText>
                }
              />
            ))}
          </View>
        )}
      </Surface>
    </View>
  );

  useEffect(() => {
    if (isPremium) {
      fetchAnalytics();
    }
  }, [range, isPremium, fetchAnalytics]);

  const handleExport = async (format: "csv" | "json") => {
    try {
      setExporting(true);
      const res = await exportReport(format);
      const msg =
        format === "csv"
          ? "Laporan nutrisi berhasil diekspor dalam format CSV."
          : "Laporan nutrisi berhasil diekspor dalam format JSON.";

      if (Platform.OS === "web" && typeof document !== "undefined") {
        const isCsv = format === "csv";
        const content =
          isCsv && typeof res === "string" ? res : JSON.stringify(res, null, 2);
        const mime = isCsv
          ? "text/csv;charset=utf-8;"
          : "application/json;charset=utf-8;";
        const ext = isCsv ? "csv" : "json";
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `better_life_nutrition_${range}.${ext}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setExportNotice(msg);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Gagal mengekspor data nutrisi saat ini.");
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setExporting(false);
    }
  };

  // If user does not have Premium entitlement, display Monitoring overview + clean Vialo upgrade gate
  if (!isPremium) {
    return (
      <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#edf1ee]" testID="analytics-screen-locked">
        <Header
          onBack={() => router.back()}
          title="Monitoring & analitik nutrisi"
          subtitle="Statistik berat badan, histori menu, dan tren kalori"
          rightComponent={<StatusPill tone="warn" label="Gratis" />}
        />

        <ScrollView
          className="flex-1 pt-2"
          contentContainerStyle={{ paddingBottom: 64 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="max-w-xl mx-auto w-full gap-4 mt-2">
            {renderMonitoringOverview()}

            <ColorBlock tone="amber">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-9 h-9 rounded-full bg-[#1b1406]/10 items-center justify-center">
                  <LineIcon name="crown" size={18} color="#1b1406" />
                </View>
                <AppText weight="bold" className="text-xs uppercase tracking-wider text-[#1b1406]/75">
                  Inteligensi Nutrisi Premium
                </AppText>
              </View>
              <AppText
                weight="semibold"
                className="text-2xl text-[#1b1406] mb-1.5"
                style={{ letterSpacing: -0.5 }}
              >
                Pantau tren kalori 7 & 30 hari secara presisi
              </AppText>
              <AppText weight="regular" className="text-xs text-[#1b1406]/80 leading-relaxed mb-4">
                Buka grafik kepatuhan target harian, proporsi energi makronutrisi, analisis waktu makan, serta estimasi pengeluaran belanja dari jurnal makanan Anda.
              </AppText>
              <View className="self-start">
                <PillButton
                  label="Tingkatkan ke Premium"
                  variant="dark"
                  icon={<LineIcon name="arrow-up-right" size={14} color="#ffffff" />}
                  onPress={() => router.push("/(app)/upgrade")}
                  accessibilityLabel="Upgrade to Premium"
                />
              </View>
            </ColorBlock>

            <Surface>
              <CardHead
                title="Fitur analitik yang terbuka"
                subtitle="Dihitung langsung dari catatan makan harian Anda"
              />
              <ListRow
                first
                left={
                  <RowIcon tone="green">
                    <LineIcon name="chart" size={16} color="#0e7a52" />
                  </RowIcon>
                }
                title="Tren kalori & skor kepatuhan 7/30 hari"
                subtitle="Evaluasi surplus atau defisit kalori terhadap target harian"
                right={<StatusPill tone="ok" label="Termasuk" />}
              />
              <ListRow
                left={
                  <RowIcon tone="amber">
                    <LineIcon name="flame" size={16} color="#946000" />
                  </RowIcon>
                }
                title="Proporsi energi makronutrisi"
                subtitle="Distribusi kalori dari protein, karbohidrat, lemak, dan serat"
                right={<StatusPill tone="ok" label="Termasuk" />}
              />
              <ListRow
                last
                left={
                  <RowIcon tone="soft">
                    <LineIcon name="wallet" size={16} color="#121a16" />
                  </RowIcon>
                }
                title="Estimasi biaya pangan & ekspor CSV"
                subtitle="Ringkasan pengeluaran makan harian dan unduhan data lengkap"
                right={<StatusPill tone="ok" label="Termasuk" />}
              />
            </Surface>
          </View>
        </ScrollView>
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

  const delta = analyticsData?.summary.targetComparison.deltaKcal || 0;
  const isWithinTarget = Math.abs(delta) <= targetCalories * 0.1;

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#edf1ee]" testID="analytics-screen">
      <Header
        onBack={() => router.back()}
        title="Monitoring & analitik nutrisi"
        subtitle="Evaluasi berat badan, histori menu, kalori, makronutrisi, dan anggaran"
        rightComponent={
          <RingButton
            onPress={() => fetchAnalytics()}
            accessibilityLabel="Perbarui data analitik"
          >
            <LineIcon name="refresh" size={16} color="#121a16" />
          </RingButton>
        }
      />

      <ScrollView
        className="flex-1 pt-1"
        contentContainerStyle={{ paddingBottom: 72 }}
        showsVerticalScrollIndicator={false}
      >
        {renderMonitoringOverview()}

        {/* Top Controls Strip: Range Segmented Control + Export Action */}
        <View className="flex-row items-center justify-between flex-wrap gap-2.5 mb-4">
          <Segmented<DateRangeOption>
            value={range}
            onChange={(val) => {
              if (val === "custom") {
                void setRange("custom", customStartInput, customEndInput);
              } else {
                void setRange(val);
              }
            }}
            options={[
              { value: "7d", label: "7 Hari" },
              { value: "30d", label: "30 Hari" },
              { value: "custom", label: "Khusus" },
            ]}
          />
          <PillButton
            label={exporting ? "Mengekspor..." : "Ekspor CSV"}
            size="sm"
            variant="ghost"
            icon={<LineIcon name="download" size={14} color="#121a16" />}
            onPress={() => handleExport("csv")}
            disabled={exporting}
            accessibilityLabel="Ekspor data nutrisi sebagai CSV"
          />
        </View>

        {range === "custom" && (
          <Surface className="mb-4 py-3.5 px-4">
            <View className="flex-col sm:flex-row sm:items-end gap-3">
              <View className="flex-1">
                <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                  Tanggal mulai (YYYY-MM-DD)
                </AppText>
                <TextInput
                  value={customStartInput}
                  onChangeText={setCustomStartInput}
                  placeholder="2026-11-10"
                  className="h-10 px-3 rounded-[12px] bg-card-2 border border-line text-ink text-xs"
                  style={{ fontFamily: "Urbanist-SemiBold" }}
                />
              </View>
              <View className="flex-1">
                <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                  Tanggal akhir (YYYY-MM-DD)
                </AppText>
                <TextInput
                  value={customEndInput}
                  onChangeText={setCustomEndInput}
                  placeholder="2026-11-18"
                  className="h-10 px-3 rounded-[12px] bg-card-2 border border-line text-ink text-xs"
                  style={{ fontFamily: "Urbanist-SemiBold" }}
                />
              </View>
              <PillButton
                label="Terapkan"
                variant="primary"
                size="sm"
                onPress={() => void setRange("custom", customStartInput.trim(), customEndInput.trim())}
              />
            </View>
          </Surface>
        )}

        {exportNotice && (
          <Surface className="mb-4 py-3 px-4 bg-[#e2f2ec] border-[#bfe0d2]">
            <View className="flex-row items-center gap-2">
              <LineIcon name="check" size={15} color="#0e7a52" />
              <AppText weight="semibold" className="text-xs text-[#0e7a52] flex-1">
                {exportNotice}
              </AppText>
            </View>
          </Surface>
        )}

        {isLoading && !analyticsData ? (
          <View className="gap-4">
            <Surface>
              <SkeletonPulse width="48%" height={18} borderRadius={8} className="mb-3" />
              <SkeletonPulse width="56%" height={38} borderRadius={10} className="mb-4" />
              <View className="flex-col sm:flex-row gap-3">
                <SkeletonPulse height={88} borderRadius={18} className="flex-1" />
                <SkeletonPulse height={88} borderRadius={18} className="flex-1" />
                <SkeletonPulse height={88} borderRadius={18} className="flex-1" />
              </View>
            </Surface>
            <Surface>
              <SkeletonPulse width="40%" height={18} borderRadius={8} className="mb-4" />
              <SkeletonPulse height={150} borderRadius={14} />
            </Surface>
          </View>
        ) : error ? (
          <Surface className="py-10 items-center justify-center">
            <View className="w-11 h-11 rounded-2xl bg-[#fde9e7] items-center justify-center mb-3">
              <LineIcon name="alert" size={20} color="#b92d26" />
            </View>
            <AppText weight="bold" className="text-sm text-[#b92d26] mb-1">
              Gagal memuat analitik
            </AppText>
            <AppText weight="regular" className="text-xs text-[#56605a] text-center mb-4 max-w-xs">
              {error}
            </AppText>
            <PillButton
              label="Coba lagi"
              variant="primary"
              onPress={() => fetchAnalytics()}
            />
          </Surface>
        ) : (
          <View className="gap-4">
            {/* 1. Target Comparison & Adherence Summary Card */}
            <FadeInView index={0}>
              <Surface>
                <CardHead
                  title="Rata-rata asupan harian"
                  subtitle={`Target kalori harian: ${targetCalories.toLocaleString("id-ID")} kcal`}
                  right={
                    <StatusPill
                      tone={isWithinTarget ? "ok" : delta > 0 ? "warn" : "info"}
                      label={`${delta > 0 ? `+${delta}` : delta} kcal selisih`}
                    />
                  }
                />

                <View className="flex-row items-baseline gap-2 mb-4 flex-wrap">
                  <AnimatedNumber
                    value={analyticsData?.summary.averageDailyCalories ?? 0}
                    formatter={(v) => Math.round(v).toLocaleString("id-ID")}
                    duration={420}
                    weight="semibold"
                    className="text-3xl sm:text-4xl text-[#121a16]"
                    style={{ fontVariant: ["tabular-nums"], letterSpacing: -1.1 }}
                  />
                  <AppText
                    weight="regular"
                    className="text-sm text-[#56605a]"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    / {targetCalories.toLocaleString("id-ID")} kcal per hari
                  </AppText>
                </View>

                {/* 3 Filled Vialo ColorBlocks */}
                <View className="flex-col sm:flex-row gap-3">
                  <ColorBlock tone="green" className="flex-1">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <AppText weight="semibold" className="text-[11px] uppercase tracking-wider text-white/75">
                        Skor kepatuhan
                      </AppText>
                      <LineIcon name="target" size={15} color="#ffffff" />
                    </View>
                    <AnimatedNumber
                      value={analyticsData?.summary.adherenceScore ?? 0}
                      formatter={(v) => `${Math.round(v)}%`}
                      duration={420}
                      weight="semibold"
                      className="text-2xl text-white"
                      style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.6 }}
                    />
                    <AppText weight="regular" className="text-[11px] text-white/80 mt-0.5">
                      Kalibrasi terhadap target
                    </AppText>
                  </ColorBlock>

                  <ColorBlock tone="amber" className="flex-1">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <AppText weight="semibold" className="text-[11px] uppercase tracking-wider text-[#1b1406]/75">
                        Asupan serat
                      </AppText>
                      <LineIcon name="leaf" size={15} color="#1b1406" />
                    </View>
                    <AppText
                      weight="semibold"
                      className="text-xl text-[#1b1406]"
                      style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.5 }}
                    >
                      {analyticsData?.summary.fiberScore === "Optimal"
                        ? "Optimal"
                        : analyticsData?.summary.fiberScore === "Needs Improvement"
                        ? "Perlu ditambah"
                        : analyticsData?.summary.fiberScore || "Belum tercatat"}
                    </AppText>
                    <AppText weight="regular" className="text-[11px] text-[#1b1406]/80 mt-0.5">
                      Standar 25g serat / hari
                    </AppText>
                  </ColorBlock>

                  <ColorBlock tone="ink" className="flex-1">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <AppText weight="semibold" className="text-[11px] uppercase tracking-wider text-[#f2f6f3]/75">
                        Hari tercatat
                      </AppText>
                      <LineIcon name="calendar" size={15} color="#f2f6f3" />
                    </View>
                    <AppText
                      weight="semibold"
                      className="text-2xl text-[#f2f6f3]"
                      style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.6 }}
                    >
                      {analyticsData?.consistency.loggedDaysCount} / {analyticsData?.consistency.totalDaysInRange}
                    </AppText>
                    <AppText
                      weight="regular"
                      className="text-[11px] text-[#f2f6f3]/80 mt-0.5"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {analyticsData?.consistency.dataCoveragePercentage}% cakupan data
                    </AppText>
                  </ColorBlock>
                </View>
              </Surface>
            </FadeInView>

            {/* 2. Vialo-styled Calorie Trend Bar Chart */}
            <FadeInView index={1}>
              <Surface>
                <CardHead
                  title="Tren kalori harian"
                  subtitle="Ketuk batang hari untuk memeriksa makanan & makronutrisi"
                  right={
                    <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fdf3d6] border border-[#f3d48a]">
                      <View className="w-2.5 h-0.5 bg-[#946000]" />
                      <AppText
                        weight="semibold"
                        className="text-[11px] text-[#946000]"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        Target {targetCalories} kcal
                      </AppText>
                    </View>
                  }
                />

                {/* Accessible narrative for screen readers */}
                <View
                  accessibilityRole="summary"
                  accessibilityLabel={`Calorie trend for ${range}. ${analyticsData?.narrative}`}
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
                >
                  <AppText weight="regular" className="text-xs text-transparent h-0">
                    {analyticsData?.narrative}
                  </AppText>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ minWidth: "100%", paddingTop: 18, paddingBottom: 4 }}
                >
                  <View className="flex-row items-end gap-2.5 h-48 pb-7 pt-2 relative flex-1 justify-between">
                    {/* Vialo .bars__grid dashed horizontal reference lines */}
                    {[0.25, 0.5, 0.75, 1].map((step) => (
                      <View
                        key={step}
                        style={{
                          bottom: 28 + step * 140,
                          left: 0,
                          right: 0,
                        }}
                        className="absolute h-[1px] border-b border-dashed border-[#e6eae7] z-0"
                      />
                    ))}

                    {/* Target Calorie Line */}
                    <View
                      style={{
                        bottom: 28 + (targetCalories / maxCaloriesInTrend) * 140,
                        left: 0,
                        right: 0,
                      }}
                      className="absolute h-[1px] border-b border-dashed border-[#f3b23c] z-0"
                    />

                    {dailyTrends.map((pt, barIdx) => {
                      const isSelected = selectedPoint?.date === pt.date;
                      const barHeightPct = pt.hasData
                        ? Math.max(8, Math.min(100, Math.round((pt.calories / maxCaloriesInTrend) * 100)))
                        : 6;

                      const barColor = !pt.hasData
                        ? "#dfe6e1"
                        : pt.adherenceStatus === "on_target"
                        ? "#0e7a52"
                        : pt.adherenceStatus === "over_target"
                        ? "#f3b23c"
                        : "#285c9c";

                      return (
                        <PressableScale
                          key={pt.date}
                          onPress={() => setSelectedPoint(pt)}
                          pressedScale={0.97}
                          accessibilityRole="button"
                          accessibilityLabel={buildAccessibleDayDescription(pt)}
                          className="items-center justify-end h-full flex-1 min-w-[30px] max-w-[46px] z-10"
                        >
                          {/* Selected Day Calorie Pill */}
                          {isSelected && pt.hasData && (
                            <View className="absolute -top-5 px-2 py-0.5 rounded-full bg-[#121a16] items-center justify-center z-20">
                              <AppText
                                weight="bold"
                                className="text-[10px] text-white"
                                style={{ fontVariant: ["tabular-nums"] }}
                              >
                                {pt.calories}
                              </AppText>
                            </View>
                          )}

                          {/* Vialo .bars__track ghost column + .bars__fill */}
                          <View
                            className={`w-full h-full rounded-[10px] bg-[#f0f4f1] overflow-hidden justify-end ${
                              isSelected ? "border-2 border-[#121a16]" : "border border-[#e6eae7]"
                            }`}
                          >
                            <AnimatedTrendBar
                              targetHeightPct={barHeightPct}
                              color={barColor}
                              index={barIdx}
                            />
                          </View>

                          {/* Day Label */}
                          <View className="absolute -bottom-6 items-center">
                            <AppText
                              weight={isSelected ? "bold" : "medium"}
                              className={`text-[11px] ${
                                isSelected ? "text-[#121a16]" : "text-[#56605a]"
                              }`}
                            >
                              {pt.dayLabel.split(" ")[0]}
                            </AppText>
                          </View>
                        </PressableScale>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Legend */}
                <View className="flex-row items-center justify-between flex-wrap gap-3 pt-4 mt-2 border-t border-[#e6eae7]">
                  <View className="flex-row items-center gap-4 flex-wrap">
                    <View className="flex-row items-center gap-1.5">
                      <View className="w-2.5 h-2.5 rounded-[3px] bg-[#0e7a52]" />
                      <AppText weight="medium" className="text-xs text-[#56605a]">
                        Sesuai target (±15%)
                      </AppText>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <View className="w-2.5 h-2.5 rounded-[3px] bg-[#285c9c]" />
                      <AppText weight="medium" className="text-xs text-[#56605a]">
                        Di bawah target
                      </AppText>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <View className="w-2.5 h-2.5 rounded-[3px] bg-[#f3b23c]" />
                      <AppText weight="medium" className="text-xs text-[#56605a]">
                        Di atas target
                      </AppText>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <View className="w-2.5 h-2.5 rounded-[3px] bg-[#dfe6e1]" />
                      <AppText weight="medium" className="text-xs text-[#56605a]">
                        Belum tercatat
                      </AppText>
                    </View>
                  </View>
                </View>
              </Surface>
            </FadeInView>

            {/* 3. Selected Day Detailed Inspector */}
            {selectedPoint && (
              <FadeInView key={selectedPoint.date} duration={220} translateY={4}>
                <Surface>
                  <CardHead
                    title={`${selectedPoint.dayLabel} (${selectedPoint.date})`}
                    subtitle="Rincian makronutrisi dan daftar makanan yang dicatat"
                    right={(() => {
                      const badge = getAdherenceBadge(selectedPoint.adherenceStatus);
                      const tone =
                        selectedPoint.adherenceStatus === "on_target"
                          ? "ok"
                          : selectedPoint.adherenceStatus === "over_target"
                          ? "warn"
                          : "info";
                      return <StatusPill tone={tone} label={badge.label} />;
                    })()}
                  />

                  {selectedPoint.hasData ? (
                    <View className="gap-4">
                      {/* Day Macro Stats Strip — 2x2 rows on mobile */}
                      <View className="gap-2.5">
                        {[
                          [
                            { label: "Kalori", value: `${selectedPoint.calories} kcal`, accent: true },
                            { label: "Protein", value: formatGrams(selectedPoint.proteinGrams) },
                          ],
                          [
                            { label: "Karbohidrat", value: formatGrams(selectedPoint.carbsGrams) },
                            { label: "Lemak", value: formatGrams(selectedPoint.fatGrams) },
                          ],
                        ].map((row, rowIdx) => (
                          <View key={rowIdx} className="flex-row gap-2.5">
                            {row.map((m) => (
                              <View
                                key={m.label}
                                className="flex-1 min-w-0 p-3 rounded-[14px] bg-[#f0f4f1] border border-[#e6eae7]"
                              >
                                <AppText weight="medium" className="text-[11px] text-[#56605a]">
                                  {m.label}
                                </AppText>
                                <AppText
                                  weight="semibold"
                                  className={`text-sm mt-0.5 ${
                                    m.accent ? "text-[#0e7a52]" : "text-[#121a16]"
                                  }`}
                                  style={{ fontVariant: ["tabular-nums"] }}
                                >
                                  {m.value}
                                </AppText>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>

                      {/* Meal entries logged for this day */}
                      <View>
                        <AppText weight="semibold" className="text-xs text-[#56605a] mb-1">
                          Makanan tercatat ({selectedPoint.meals.length})
                        </AppText>
                        {selectedPoint.meals.map((meal, idx) => (
                          <ListRow
                            key={meal.id}
                            first={idx === 0}
                            last={idx === selectedPoint.meals.length - 1}
                            left={
                              <RowIcon tone="green">
                                <LineIcon name="utensils" size={15} color="#0e7a52" />
                              </RowIcon>
                            }
                            title={meal.name}
                            subtitle={meal.type}
                            right={
                              <View className="items-end">
                                <AppText
                                  weight="semibold"
                                  className="text-[13px] text-[#121a16]"
                                  style={{ fontVariant: ["tabular-nums"] }}
                                >
                                  {meal.calories} kcal
                                </AppText>
                                {meal.estimatedCostIdr ? (
                                  <AppText
                                    weight="regular"
                                    className="text-[11px] text-[#56605a]"
                                    style={{ fontVariant: ["tabular-nums"] }}
                                  >
                                    {formatIdr(meal.estimatedCostIdr)}
                                  </AppText>
                                ) : null}
                              </View>
                            }
                          />
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View className="py-6 items-center justify-center bg-[#f0f4f1] rounded-[16px] border border-[#e6eae7] px-4">
                      <AppText weight="semibold" className="text-sm text-[#121a16] mb-1">
                        Belum ada catatan pada hari ini
                      </AppText>
                      <AppText weight="regular" className="text-xs text-[#56605a] text-center max-w-xs leading-relaxed">
                        Hari tanpa catatan dipisahkan dari asupan nol agar rata-rata mingguan Anda tetap akurat.
                      </AppText>
                    </View>
                  )}
                </Surface>
              </FadeInView>
            )}

            {/* 4. Macronutrient Energy Distribution */}
            <FadeInView index={2}>
              <Surface>
                <CardHead
                  title="Distribusi energi makronutrisi"
                  subtitle="Kontribusi kalori dari seluruh makanan yang tercatat"
                  right={<StatusPill tone="ok" label="Proporsi energi" />}
                />

                <MixBar
                  height={12}
                  segments={[
                    {
                      value: analyticsData?.macroDistribution.proteinPercentage || 25,
                      color: "#0e7a52",
                      label: "Protein",
                    },
                    {
                      value: analyticsData?.macroDistribution.carbsPercentage || 50,
                      color: "#f3b23c",
                      label: "Karbo",
                    },
                    {
                      value: analyticsData?.macroDistribution.fatPercentage || 25,
                      color: "#141c18",
                      label: "Lemak",
                    },
                  ]}
                />

                <View className="flex-col sm:flex-row gap-3 mt-4">
                  {[
                    {
                      label: "Protein",
                      pct: analyticsData?.macroDistribution.proteinPercentage || 0,
                      actual: formatGrams(analyticsData?.macroDistribution.grams.protein || 0),
                      target: formatGrams(analyticsData?.macroDistribution.targetGrams.protein || 0),
                      dotColor: "#0e7a52",
                    },
                    {
                      label: "Karbohidrat",
                      pct: analyticsData?.macroDistribution.carbsPercentage || 0,
                      actual: formatGrams(analyticsData?.macroDistribution.grams.carbs || 0),
                      target: formatGrams(analyticsData?.macroDistribution.targetGrams.carbs || 0),
                      dotColor: "#f3b23c",
                    },
                    {
                      label: "Lemak sehat",
                      pct: analyticsData?.macroDistribution.fatPercentage || 0,
                      actual: formatGrams(analyticsData?.macroDistribution.grams.fat || 0),
                      target: formatGrams(analyticsData?.macroDistribution.targetGrams.fat || 0),
                      dotColor: "#141c18",
                    },
                  ].map((m) => (
                    <View
                      key={m.label}
                      className="flex-1 p-3.5 rounded-[16px] bg-[#f0f4f1] border border-[#e6eae7]"
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center gap-1.5">
                          <View
                            style={{ backgroundColor: m.dotColor }}
                            className="w-2.5 h-2.5 rounded-[3px]"
                          />
                          <AppText weight="semibold" className="text-xs text-[#121a16]">
                            {m.label}
                          </AppText>
                        </View>
                        <AppText
                          weight="bold"
                          className="text-xs text-[#56605a]"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {m.pct}%
                        </AppText>
                      </View>
                      <AppText
                        weight="semibold"
                        className="text-lg text-[#121a16]"
                        style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.4 }}
                      >
                        {m.actual}
                      </AppText>
                      <AppText
                        weight="regular"
                        className="text-[11px] text-[#56605a] mt-0.5"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        Target harian: {m.target}
                      </AppText>
                    </View>
                  ))}
                </View>
              </Surface>
            </FadeInView>

            {/* 5 & 6. Two-column grid: Consistency & Spending */}
            <FadeInView index={3}>
              <View className="flex-col lg:flex-row gap-4">
                {/* Logging Consistency & Meal Timing */}
                <Surface className="flex-1">
                  <CardHead
                    title="Konsistensi & waktu makan"
                    subtitle="Rentetan hari aktif dan proporsi sesi makan"
                  />

                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 p-3.5 rounded-[16px] bg-[#f0f4f1] border border-[#e6eae7]">
                      <AppText weight="medium" className="text-[11px] text-[#56605a]">
                        Rentetan aktif
                      </AppText>
                      <AppText
                        weight="semibold"
                        className="text-xl text-[#0e7a52] mt-0.5"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {analyticsData?.consistency.currentStreakDays} hari
                      </AppText>
                      <AppText weight="regular" className="text-[11px] text-[#56605a] mt-0.5">
                        Pencatatan beruntun
                      </AppText>
                    </View>

                    <View className="flex-1 p-3.5 rounded-[16px] bg-[#f0f4f1] border border-[#e6eae7]">
                      <AppText weight="medium" className="text-[11px] text-[#56605a]">
                        Rata-rata sesi
                      </AppText>
                      <AppText
                        weight="semibold"
                        className="text-xl text-[#121a16] mt-0.5"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {analyticsData?.consistency.averageMealsPerLoggedDay}x / hari
                      </AppText>
                      <AppText
                        weight="regular"
                        className="text-[11px] text-[#56605a] mt-0.5"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {analyticsData?.consistency.totalMealsLogged} total porsi
                      </AppText>
                    </View>
                  </View>

                  <View className="gap-2.5">
                    {[
                      {
                        label: "Sarapan",
                        pct: analyticsData?.consistency.mealTimingDistribution.breakfastPercentage || 0,
                        color: "#f3b23c",
                      },
                      {
                        label: "Makan siang",
                        pct: analyticsData?.consistency.mealTimingDistribution.lunchPercentage || 0,
                        color: "#0e7a52",
                      },
                      {
                        label: "Makan malam",
                        pct: analyticsData?.consistency.mealTimingDistribution.dinnerPercentage || 0,
                        color: "#285c9c",
                      },
                      {
                        label: "Camilan",
                        pct: analyticsData?.consistency.mealTimingDistribution.snacksPercentage || 0,
                        color: "#141c18",
                      },
                    ].map((s) => (
                      <View key={s.label} className="flex-row items-center justify-between gap-3">
                        <AppText weight="medium" className="text-xs text-[#121a16] w-24">
                          {s.label}
                        </AppText>
                        <View className="flex-1 h-2 rounded-full bg-[#f0f4f1] overflow-hidden border border-[#e6eae7]">
                          <AnimatedTimingFill targetPct={s.pct} color={s.color} />
                        </View>
                        <AppText
                          weight="semibold"
                          className="text-xs text-[#56605a] w-10 text-right"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {s.pct}%
                        </AppText>
                      </View>
                    ))}
                  </View>
                </Surface>

                {/* Estimated Grocery & Food Spending */}
                <Surface className="flex-1">
                  <CardHead
                    title="Estimasi biaya konsumsi"
                    subtitle="Berdasarkan patokan harga bahan pangan lokal"
                    right={
                      <StatusPill
                        tone="ok"
                        label={`${analyticsData?.spending.pricingCoveragePct}% terhitung`}
                      />
                    }
                  />

                  <ListRow
                    first
                    left={
                      <RowIcon tone="green">
                        <LineIcon name="wallet" size={16} color="#0e7a52" />
                      </RowIcon>
                    }
                    title="Total estimasi periode"
                    subtitle={`Akumulasi selama periode ${
                      range === "7d"
                        ? "7 hari"
                        : range === "30d"
                        ? "30 hari"
                        : analyticsData?.startDate && analyticsData?.endDate
                        ? `${analyticsData.startDate} s/d ${analyticsData.endDate}`
                        : "rentang khusus"
                    }`}
                    right={
                      <AppText
                        weight="semibold"
                        className="text-sm text-[#0e7a52]"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {formatIdr(analyticsData?.spending.totalEstimatedCostIdr || 0)}
                      </AppText>
                    }
                  />
                  <ListRow
                    left={
                      <RowIcon tone="amber">
                        <LineIcon name="calendar" size={16} color="#946000" />
                      </RowIcon>
                    }
                    title="Rata-rata biaya harian"
                    subtitle="Dihitung pada hari dengan jurnal aktif"
                    right={
                      <AppText
                        weight="semibold"
                        className="text-sm text-[#121a16]"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {formatIdr(analyticsData?.spending.averageDailyCostIdr || 0)}
                      </AppText>
                    }
                  />
                  <ListRow
                    last
                    left={
                      <RowIcon tone="soft">
                        <LineIcon name="utensils" size={16} color="#121a16" />
                      </RowIcon>
                    }
                    title="Rata-rata biaya per porsi"
                    subtitle="Berdasarkan entri makanan yang memiliki harga"
                    right={
                      <AppText
                        weight="semibold"
                        className="text-sm text-[#121a16]"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {formatIdr(analyticsData?.spending.averageCostPerMealIdr || 0)}
                      </AppText>
                    }
                  />
                </Surface>
              </View>
            </FadeInView>

            {/* 7. Clinical Narrative & Recommendations */}
            <Surface>
              <CardHead
                title="Ringkasan & panduan nutrisi"
                subtitle="Evaluasi otomatis dari pola asupan Anda"
              />
              <AppText weight="regular" className="text-[13px] text-[#2e3a33] leading-relaxed mb-3">
                {analyticsData?.narrative}
              </AppText>

              <View className="pt-2 border-t border-[#e6eae7]">
                {analyticsData?.insights.map((insight, idx) => (
                  <ListRow
                    key={idx}
                    first={idx === 0}
                    last={idx === (analyticsData?.insights.length || 1) - 1}
                    left={
                      <RowIcon tone="green">
                        <LineIcon name="sparkle" size={15} color="#0e7a52" />
                      </RowIcon>
                    }
                    title={insight}
                  />
                ))}
              </View>

              <View className="mt-3 pt-3 border-t border-[#e6eae7]">
                <AppText weight="regular" className="text-[11px] text-[#56605a] text-center">
                  {analyticsData?.disclaimer}
                </AppText>
              </View>
            </Surface>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
