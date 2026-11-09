import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
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
} from "@/components/ui";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import {
  DateRangeOption,
  formatIdr,
  formatGrams,
  getAdherenceBadge,
  buildAccessibleDayDescription,
} from "@/lib/analyticsDomain";

export default function AnalyticsScreen() {
  const router = useRouter();

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
          ? "Laporan nutrisi berhasil diekspor dalam format CSV."
          : "Laporan nutrisi berhasil diekspor dalam format JSON.";

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
      Alert.alert("Ekspor Gagal", "Tidak dapat mengekspor data nutrisi saat ini.");
    } finally {
      setExporting(false);
    }
  };

  // If user does not have Premium entitlement, display clean Vialo upgrade gate
  if (!isPremium) {
    return (
      <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#edf1ee]" testID="analytics-screen-locked">
        <Header
          onBack={() => router.back()}
          title="Tren & analitik nutrisi"
          subtitle="Fitur analitik mendalam Better Life Premium"
          rightComponent={<StatusPill tone="warn" label="Premium" />}
        />

        <ScrollView
          className="flex-1 pt-2"
          contentContainerStyle={{ paddingBottom: 64 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="max-w-xl mx-auto w-full gap-4 mt-2">
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
        title="Tren & analitik nutrisi"
        subtitle="Evaluasi kalori, makronutrisi, dan anggaran dari jurnal Anda"
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
        {/* Top Controls Strip: Range Segmented Control + Export Action */}
        <View className="flex-row items-center justify-between flex-wrap gap-2.5 mb-4">
          <Segmented<DateRangeOption>
            value={range}
            onChange={(val) => setRange(val)}
            options={[
              { value: "7d", label: "7 Hari" },
              { value: "30d", label: "30 Hari" },
            ]}
          />
          <PillButton
            label={exporting ? "Mengekspor..." : "Ekspor CSV"}
            size="sm"
            variant="ghost"
            icon={<LineIcon name="download" size={14} color="#121a16" />}
            onPress={() => handleExport("csv")}
            disabled={exporting}
            accessibilityLabel="Export nutrition data as CSV"
          />
        </View>

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
          <Surface className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#0e7a52" />
            <AppText weight="medium" className="text-xs text-[#56605a] mt-3">
              Menghitung tren nutrisi...
            </AppText>
          </Surface>
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
                <AppText
                  weight="semibold"
                  className="text-3xl sm:text-4xl text-[#121a16]"
                  style={{ fontVariant: ["tabular-nums"], letterSpacing: -1.1 }}
                >
                  {analyticsData?.summary.averageDailyCalories.toLocaleString("id-ID")}
                </AppText>
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
                  <AppText
                    weight="semibold"
                    className="text-2xl text-white"
                    style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.6 }}
                  >
                    {analyticsData?.summary.adherenceScore}%
                  </AppText>
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
                    className="text-2xl text-[#1b1406]"
                    style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.6 }}
                  >
                    {analyticsData?.summary.fiberScore}
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

            {/* 2. Vialo-styled Calorie Trend Bar Chart */}
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

                  {dailyTrends.map((pt) => {
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
                          <View
                            style={{
                              height: `${barHeightPct}%`,
                              backgroundColor: barColor,
                            }}
                            className="w-full rounded-[8px]"
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

            {/* 3. Selected Day Detailed Inspector */}
            {selectedPoint && (
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
            )}

            {/* 4. Macronutrient Energy Distribution */}
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

            {/* 5 & 6. Two-column grid: Consistency & Spending */}
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
                        <View
                          style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                          className="h-full rounded-full"
                        />
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
                  subtitle={`Akumulasi selama periode ${range === "7d" ? "7 hari" : "30 hari"}`}
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
