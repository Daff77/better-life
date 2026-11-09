import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
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
  SURFACE_SHADOW,
} from "@/components/ui";
import { useMealPlannerStore } from "@/stores/useMealPlannerStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { getMealIllustration } from "@/constants/Assets";
import {
  MealSlot,
  DIETARY_RESTRICTION_OPTIONS,
  COMMON_ALLERGENS,
  DEFAULT_MEAL_SLOTS,
  formatIdr,
} from "@/lib/mealPlannerDomain";

export default function MealPlannerScreen() {
  const router = useRouter();
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  const {
    activePlan,
    selectedDayIndex,
    preferences,
    isLoading,
    isGenerating,
    isSaving,
    hasUnsavedChanges,
    checkedShoppingItemIds,
    preferenceModalOpen,
    substitutionModal,
    setSelectedDayIndex,
    setPreferenceModalOpen,
    updatePreferences,
    loadSavedPlan,
    generatePlan,
    savePlan,
    openSubstitutionModal,
    closeSubstitutionModal,
    replaceMeal,
    toggleShoppingItem,
    clearCheckedShoppingItems,
  } = useMealPlannerStore();

  const [activeTab, setActiveTab] = useState<"schedule" | "shopping">("schedule");

  // Local preferences form state
  const [calorieInput, setCalorieInput] = useState<string>(
    String(preferences.dailyCalorieTarget || 2000)
  );
  const [budgetInput, setBudgetInput] = useState<string>(
    String(preferences.dailyBudgetIdr || 50000)
  );
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(
    preferences.dietaryRestrictions || []
  );
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(
    preferences.allergies || []
  );
  const [selectedSlots] = useState<MealSlot[]>(
    preferences.preferredMealSlots || DEFAULT_MEAL_SLOTS
  );
  const [pantryInput, setPantryInput] = useState<string>(
    (preferences.availableIngredients || []).join(", ")
  );

  useEffect(() => {
    if (isPremium) {
      loadSavedPlan();
    }
  }, [isPremium]);

  const handleGenerateSubmit = async () => {
    const cals = parseInt(calorieInput, 10) || 2000;
    const budget = parseInt(budgetInput, 10) || 50000;
    const pantry = pantryInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    updatePreferences({
      dailyCalorieTarget: cals,
      dailyBudgetIdr: budget,
      dietaryRestrictions: selectedRestrictions,
      allergies: selectedAllergies,
      preferredMealSlots: selectedSlots,
      availableIngredients: pantry,
      mealsPerDay: selectedSlots.length,
    });

    try {
      await generatePlan();
      Alert.alert(
        "Rencana Makan Siap",
        "Jadwal menu 7 hari telah disusun sesuai target nutrisi dan anggaran Anda."
      );
    } catch (err: any) {
      Alert.alert("Gagal Menyusun", err.message || "Gagal menyusun rencana makan.");
    }
  };

  const handleSavePlan = async () => {
    try {
      await savePlan();
      Alert.alert("Rencana Tersimpan", "Jadwal makan 7 hari Anda telah disimpan ke akun.");
    } catch (err: any) {
      Alert.alert("Gagal Menyimpan", err.message || "Tidak dapat menyimpan rencana makan.");
    }
  };

  const currentDay = activePlan?.days?.[selectedDayIndex] || null;

  // Free Teaser / Preview View
  if (!isPremium) {
    return (
      <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#edf1ee]">
        <Header
          onBack={() => router.back()}
          title="Rencana makan 7 hari"
          subtitle="Jadwal menu otomatis, filter alergi, dan optimasi anggaran belanja"
          rightComponent={<StatusPill tone="warn" label="Premium" />}
        />

        <ScrollView
          className="flex-1 pt-2"
          contentContainerStyle={{ paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="max-w-3xl mx-auto w-full gap-4">
            <ColorBlock tone="amber">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-9 h-9 rounded-full bg-[#1b1406]/10 items-center justify-center">
                  <LineIcon name="crown" size={18} color="#1b1406" />
                </View>
                <AppText weight="bold" className="text-xs uppercase tracking-wider text-[#1b1406]/75">
                  Perencana Nutrisi Otomatis
                </AppText>
              </View>
              <AppText
                weight="semibold"
                className="text-2xl text-[#1b1406] mb-1.5"
                style={{ letterSpacing: -0.5 }}
              >
                Susun menu mingguan sesuai kalori & anggaran pasar lokal
              </AppText>
              <AppText weight="regular" className="text-xs text-[#1b1406]/80 leading-relaxed mb-4">
                Tanpa tebak-tebakan. Setiap sesi makan dihitung lengkap dengan kalori terverifikasi, makronutrisi presisi, dan daftar belanja terintegrasi.
              </AppText>
              <View className="self-start">
                <PillButton
                  label="Tingkatkan ke Premium"
                  variant="dark"
                  icon={<LineIcon name="arrow-up-right" size={14} color="#ffffff" />}
                  onPress={() => router.push("/(app)/upgrade")}
                  accessibilityLabel="Upgrade to Premium to Unlock Meal Planner"
                />
              </View>
            </ColorBlock>

            {/* Sample 1-Day Schedule Preview */}
            <Surface>
              <CardHead
                title="Contoh jadwal makan 1 hari"
                subtitle="Total 1.540 kcal · Protein 100g · Estimasi Rp 83.000"
                right={<StatusPill tone="ok" label="Pratinjau" />}
              />

              {[
                {
                  slot: "Sarapan",
                  title: "Greek Yogurt Berry Bowl",
                  meta: "Protein 22g · Karbo 38g · Lemak 6g",
                  kcal: "320 kcal",
                  cost: "Rp 28.000",
                },
                {
                  slot: "Makan Siang",
                  title: "Mediterranean Herb Chicken Bowl",
                  meta: "Protein 48g · Karbo 45g · Lemak 18g",
                  kcal: "580 kcal",
                  cost: "Rp 24.000",
                },
                {
                  slot: "Makan Malam",
                  title: "Turmeric Coconut Tofu & Veg Curry",
                  meta: "Protein 24g · Karbo 52g · Lemak 18g",
                  kcal: "480 kcal",
                  cost: "Rp 22.000",
                },
                {
                  slot: "Camilan",
                  title: "Cucumber Spears & Garlic Hummus",
                  meta: "Protein 6g · Karbo 16g · Lemak 8g",
                  kcal: "160 kcal",
                  cost: "Rp 9.000",
                },
              ].map((sample, idx) => (
                <ListRow
                  key={sample.slot}
                  first={idx === 0}
                  last={idx === 3}
                  left={
                    <View className="w-12 h-12 rounded-[14px] overflow-hidden bg-[#dfe6e1] border border-[#e6eae7]">
                      <Image
                        source={getMealIllustration(sample.slot)}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                  }
                  title={`${sample.slot} · ${sample.title}`}
                  subtitle={sample.meta}
                  right={
                    <View className="items-end">
                      <AppText
                        weight="semibold"
                        className="text-xs text-[#121a16]"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {sample.kcal}
                      </AppText>
                      <AppText
                        weight="regular"
                        className="text-[11px] text-[#0e7a52]"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {sample.cost}
                      </AppText>
                    </View>
                  }
                />
              ))}
            </Surface>

            {/* Capabilities checklist */}
            <Surface>
              <CardHead
                title="Keunggulan Meal Planner Premium"
                subtitle="Dirancang untuk konsistensi jangka panjang"
              />
              {[
                "Jadwal 7 hari bervariasi tanpa pengulangan menu yang membosankan",
                "Filter eksklusi alergen otomatis (Susu, Telur, Seafood, Kacang, Gluten, Kedelai)",
                "Dukungan preferensi diet (Vegetarian, Vegan, Pescatarian, Halal, Keto)",
                "Optimasi anggaran belanja harian sesuai harga bahan lokal Indonesia",
                "Penggantian menu 1 ketukan disertai selisih kalori & biaya langsung",
                "Daftar belanja bahan pangan terkonsolidasi dengan checklist interaktif",
              ].map((item, idx) => (
                <ListRow
                  key={idx}
                  first={idx === 0}
                  last={idx === 5}
                  left={
                    <RowIcon tone="soft">
                      <LineIcon name="check" size={15} color="#0e7a52" />
                    </RowIcon>
                  }
                  title={item}
                />
              ))}
            </Surface>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // Premium Full Interactive Experience
  const totalShoppingItems = activePlan
    ? activePlan.shoppingList.reduce((sum, c) => sum + c.items.length, 0)
    : 0;

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#edf1ee]">
      <Header
        onBack={() => router.back()}
        title="Rencana makan 7 hari"
        subtitle="Jadwal nutrisi mingguan yang dikalibrasi dengan target Anda"
        rightComponent={
          <PillButton
            label="Preferensi"
            size="sm"
            variant="ghost"
            icon={<LineIcon name="sliders" size={14} color="#121a16" />}
            onPress={() => setPreferenceModalOpen(true)}
            accessibilityLabel="Preferences"
          />
        }
      />

      <ScrollView
        className="flex-1 pt-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* If no plan generated yet, show prompt to generate */}
        {!activePlan && !isLoading && (
          <Surface className="my-4 py-10 items-center">
            <View className="w-12 h-12 rounded-2xl bg-[#e2f2ec] items-center justify-center mb-3">
              <LineIcon name="calendar" size={22} color="#0e7a52" />
            </View>
            <AppText
              weight="semibold"
              className="text-xl text-[#121a16] text-center mb-1"
              style={{ letterSpacing: -0.4 }}
            >
              Susun jadwal makan 7 hari Anda
            </AppText>
            <AppText
              weight="regular"
              className="text-xs text-[#56605a] text-center max-w-md mb-5 leading-relaxed"
            >
              Mesin perencana nutrisi kami akan menyeimbangkan resep terhadap target kalori ({preferences.dailyCalorieTarget} kcal), pantangan alergi, dan anggaran harian Anda.
            </AppText>
            <PillButton
              label={isGenerating ? "Menyusun jadwal..." : "Buat rencana 7 hari"}
              variant="primary"
              icon={<LineIcon name="sparkle" size={15} color="#ffffff" />}
              onPress={handleGenerateSubmit}
              disabled={isGenerating}
            />
          </Surface>
        )}

        {isLoading && !activePlan && (
          <Surface className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#0e7a52" />
            <AppText weight="medium" className="text-xs text-[#56605a] mt-3">
              Memuat rencana makan Anda...
            </AppText>
          </Surface>
        )}

        {activePlan && (
          <View className="gap-4">
            {/* Top Bar: Segmented Schedule vs Shopping List + Save Action */}
            <View className="flex-row items-center justify-between flex-wrap gap-2.5">
              <Segmented
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { value: "schedule", label: "Jadwal 7 Hari" },
                  { value: "shopping", label: `Daftar Belanja (${totalShoppingItems})` },
                ]}
              />
              <PillButton
                label={isSaving ? "Menyimpan..." : hasUnsavedChanges ? "Simpan perubahan" : "Tersimpan"}
                size="sm"
                variant={hasUnsavedChanges ? "primary" : "soft"}
                icon={<LineIcon name="check" size={14} color={hasUnsavedChanges ? "#ffffff" : "#121a16"} />}
                onPress={handleSavePlan}
                disabled={isSaving}
                accessibilityLabel="Save plan"
              />
            </View>

            {activeTab === "schedule" ? (
              <>
                {/* Horizontal 7-Day Selector Strip */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <View className="flex-row gap-2.5 pr-4">
                    {activePlan.days.map((day, idx) => {
                      const isSelected = selectedDayIndex === idx;
                      return (
                        <PressableScale
                          key={idx}
                          onPress={() => setSelectedDayIndex(idx)}
                          pressedScale={0.97}
                          className={`px-4 py-3 rounded-[18px] border min-w-[104px] ${
                            isSelected
                              ? "bg-[#141c18] border-[#141c18]"
                              : "bg-[#fbfdfc] border-[#e6eae7]"
                          }`}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${day.day}`}
                        >
                          <AppText
                            weight="bold"
                            className={`text-xs ${isSelected ? "text-white" : "text-[#121a16]"}`}
                          >
                            {day.day}
                          </AppText>
                          <AppText
                            weight="semibold"
                            className={`text-xs mt-1 ${
                              isSelected ? "text-[#f3b23c]" : "text-[#56605a]"
                            }`}
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {day.totals.calories} kcal
                          </AppText>
                          <AppText
                            weight="regular"
                            className={`text-[11px] mt-0.5 ${
                              isSelected ? "text-white/75" : "text-[#0e7a52]"
                            }`}
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {formatIdr(day.totals.estimatedCostIdr)}
                          </AppText>
                        </PressableScale>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Day Nutrition & Budget Summary Card */}
                {currentDay && (
                  <FadeInView key={`day-summary-${selectedDayIndex}`} index={0}>
                    <Surface>
                      <CardHead
                        title={`Ringkasan ${currentDay.day}`}
                        subtitle={`Target ${preferences.dailyCalorieTarget} kcal · Anggaran ${formatIdr(preferences.dailyBudgetIdr)}`}
                        right={
                          <View className="items-end">
                            <AppText
                              weight="bold"
                              className="text-base text-[#0e7a52]"
                              style={{ fontVariant: ["tabular-nums"] }}
                            >
                              {currentDay.totals.calories} kcal
                            </AppText>
                            <AppText
                              weight="medium"
                              className="text-xs text-[#56605a]"
                              style={{ fontVariant: ["tabular-nums"] }}
                            >
                              {formatIdr(currentDay.totals.estimatedCostIdr)}
                            </AppText>
                          </View>
                        }
                      />

                      <MixBar
                        height={10}
                        segments={[
                          { value: currentDay.totals.proteinGrams * 4, color: "#0e7a52" },
                          { value: currentDay.totals.carbsGrams * 4, color: "#f3b23c" },
                          { value: currentDay.totals.fatGrams * 9, color: "#141c18" },
                        ]}
                      />

                      {/* 2x2 macro grid on mobile */}
                      <View className="gap-2.5 mt-3.5">
                        {[
                          [
                            { label: "Protein", val: `${currentDay.totals.proteinGrams}g`, color: "#0e7a52" },
                            { label: "Karbohidrat", val: `${currentDay.totals.carbsGrams}g`, color: "#f3b23c" },
                          ],
                          [
                            { label: "Lemak sehat", val: `${currentDay.totals.fatGrams}g`, color: "#141c18" },
                            { label: "Serat pangan", val: `${currentDay.totals.fiberGrams}g`, color: "#285c9c" },
                          ],
                        ].map((row, rowIdx) => (
                          <View key={rowIdx} className="flex-row gap-2.5">
                            {row.map((m) => (
                              <View
                                key={m.label}
                                className="flex-1 min-w-0 p-3 rounded-[14px] bg-[#f0f4f1] border border-[#e6eae7]"
                              >
                                <View className="flex-row items-center gap-1.5 mb-0.5">
                                  <View
                                    style={{ backgroundColor: m.color }}
                                    className="w-2 h-2 rounded-[2px]"
                                  />
                                  <AppText weight="medium" className="text-[11px] text-[#56605a]">
                                    {m.label}
                                  </AppText>
                                </View>
                                <AppText
                                  weight="semibold"
                                  className="text-sm text-[#121a16]"
                                  style={{ fontVariant: ["tabular-nums"] }}
                                >
                                  {m.val}
                                </AppText>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    </Surface>
                  </FadeInView>
                )}

                {/* Meal Slots for Active Day */}
                {currentDay && (
                  <FadeInView key={`day-meals-${selectedDayIndex}`} index={1}>
                    <Surface>
                      <CardHead
                        title={`Susunan menu ${currentDay.day}`}
                        subtitle="Ketuk hidangan untuk melihat resep atau ganti sesuai selera"
                      />

                      <View className="gap-3">
                        {currentDay.meals.map((item, idx) => (
                          <View
                            key={idx}
                            className="p-3.5 rounded-[18px] bg-[#f0f4f1] border border-[#e6eae7] flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <PressableScale
                              onPress={() =>
                                router.push({
                                  pathname: "/(app)/recipe-detail",
                                  params: { id: item.recipe.id },
                                })
                              }
                              pressedScale={0.99}
                              className="flex-row items-center gap-3.5 flex-1 min-w-0"
                              accessibilityRole="button"
                              accessibilityLabel={`View recipe ${item.recipe.title}`}
                            >
                              <Image
                                source={
                                  item.recipe.imageUrl
                                    ? { uri: item.recipe.imageUrl }
                                    : getMealIllustration(item.slot)
                                }
                                className="w-16 h-16 rounded-[14px] bg-[#dfe6e1] flex-shrink-0"
                                resizeMode="cover"
                              />

                              <View className="flex-1 min-w-0">
                                <View className="flex-row items-center gap-1.5 flex-wrap">
                                  <StatusPill tone="neutral" label={item.slot} />
                                  {item.recipe.isPremium && (
                                    <StatusPill tone="warn" label="Koleksi Chef" />
                                  )}
                                </View>
                                <AppText
                                  weight="semibold"
                                  className="text-[14px] text-[#121a16] mt-1"
                                  numberOfLines={1}
                                >
                                  {item.recipe.title}
                                </AppText>
                                <AppText
                                  weight="regular"
                                  className="text-xs text-[#56605a] mt-0.5"
                                  style={{ fontVariant: ["tabular-nums"] }}
                                >
                                  {item.recipe.calories} kcal · {item.recipe.prepTimeMinutes} mnt ·{" "}
                                  {formatIdr(item.recipe.estimatedCostIdr || 0)}
                                </AppText>
                              </View>
                            </PressableScale>

                            <View className="self-end sm:self-center">
                              <PillButton
                                label="Ganti menu"
                                size="sm"
                                variant="ghost"
                                icon={<LineIcon name="swap" size={13} color="#121a16" />}
                                onPress={() =>
                                  openSubstitutionModal(
                                    selectedDayIndex,
                                    item.slot,
                                    item.recipe.id
                                  )
                                }
                                accessibilityLabel={`Replace ${item.slot}`}
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    </Surface>
                  </FadeInView>
                )}

                {/* Solver Notes & Wellness Disclaimer */}
                <Surface>
                  <CardHead
                    title="Catatan kalibrasi & nutrisi"
                    subtitle="Disusun berdasarkan preferensi dan target Anda"
                  />
                  {activePlan.summary.tradeOffNotes.map((note, idx) => (
                    <ListRow
                      key={idx}
                      first={idx === 0}
                      last={idx === activePlan.summary.tradeOffNotes.length - 1}
                      left={
                        <RowIcon tone="soft">
                          <LineIcon name="sparkle" size={14} color="#0e7a52" />
                        </RowIcon>
                      }
                      title={note}
                    />
                  ))}
                  <View className="mt-3 pt-3 border-t border-[#e6eae7]">
                    <AppText weight="regular" className="text-[11px] text-[#56605a] leading-relaxed">
                      {activePlan.summary.disclaimer}
                    </AppText>
                  </View>
                </Surface>
              </>
            ) : (
              /* Shopping List Mode */
              <Surface>
                <CardHead
                  title="Daftar belanja terkonsolidasi"
                  subtitle="Akumulasi kebutuhan bahan untuk jadwal 7 hari penuh"
                  right={
                    checkedShoppingItemIds.length > 0 ? (
                      <PillButton
                        label={`Bersihkan (${checkedShoppingItemIds.length})`}
                        size="sm"
                        variant="soft"
                        onPress={clearCheckedShoppingItems}
                      />
                    ) : undefined
                  }
                />

                <View className="gap-5">
                  {activePlan.shoppingList.map((cat, catIdx) => (
                    <View key={catIdx}>
                      <View className="flex-row items-center justify-between mb-2">
                        <AppText
                          weight="bold"
                          className="text-xs text-[#0e7a52] uppercase tracking-wider"
                        >
                          {cat.category}
                        </AppText>
                        <AppText
                          weight="regular"
                          className="text-[11px] text-[#56605a]"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {cat.items.length} bahan
                        </AppText>
                      </View>
                      <View className="rounded-[18px] bg-[#f0f4f1] border border-[#e6eae7] px-3.5">
                        {cat.items.map((item, itemIdx) => {
                          const isChecked = checkedShoppingItemIds.includes(item.id);
                          return (
                            <PressableScale
                              key={item.id}
                              onPress={() => toggleShoppingItem(item.id)}
                              pressedScale={0.99}
                              className={`py-3 flex-row items-center justify-between ${
                                itemIdx > 0 ? "border-t border-[#e6eae7]" : ""
                              }`}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: isChecked }}
                            >
                              <View className="flex-row items-center gap-3 flex-1 pr-2 min-w-0">
                                <View
                                  className={`w-5 h-5 rounded-[6px] border items-center justify-center flex-shrink-0 ${
                                    isChecked
                                      ? "bg-[#0e7a52] border-[#0e7a52]"
                                      : "bg-[#fbfdfc] border-[#d5dbd7]"
                                  }`}
                                >
                                  {isChecked && <LineIcon name="check" size={12} color="#ffffff" />}
                                </View>
                                <AppText
                                  weight={isChecked ? "regular" : "medium"}
                                  className={`text-[13px] flex-1 ${
                                    isChecked
                                      ? "text-[#56605a] line-through"
                                      : "text-[#121a16]"
                                  }`}
                                >
                                  {item.name}
                                </AppText>
                              </View>
                              <AppText
                                weight="semibold"
                                className={`text-xs flex-shrink-0 ${
                                  isChecked ? "text-[#56605a]" : "text-[#0e7a52]"
                                }`}
                                style={{ fontVariant: ["tabular-nums"] }}
                              >
                                {item.amount}
                              </AppText>
                            </PressableScale>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              </Surface>
            )}
          </View>
        )}
      </ScrollView>

      {/* Preferences Configuration Modal */}
      {preferenceModalOpen && (
        <View className="absolute inset-0 bg-[#121a16]/50 items-center justify-center px-4 py-8 z-50">
          <FadeInView
            duration={220}
            translateY={12}
            style={{ boxShadow: SURFACE_SHADOW } as any}
            className="w-full max-w-[500px] bg-[#fbfdfc] rounded-[24px] border border-[#e6eae7] p-5 max-h-[90%] flex-col"
          >
            <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-[#e6eae7] gap-2">
              <View className="flex-1 min-w-0">
                <AppText weight="semibold" className="text-lg text-[#121a16]">
                  Preferensi rencana makan
                </AppText>
                <AppText weight="regular" className="text-xs text-[#56605a]">
                  Sesuaikan target kalori, anggaran, dan pantangan
                </AppText>
              </View>
              <RingButton
                onPress={() => setPreferenceModalOpen(false)}
                accessibilityLabel="Tutup preferensi"
              >
                <LineIcon name="close" size={16} color="#121a16" />
              </RingButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pr-1">
              {/* Daily Calorie Target */}
              <View className="mb-4">
                <AppText weight="semibold" className="text-xs text-[#121a16] mb-1.5">
                  Target kalori harian (kcal)
                </AppText>
                <TextInput
                  value={calorieInput}
                  onChangeText={setCalorieInput}
                  keyboardType="numeric"
                  style={{ fontSize: 16 }}
                  className="w-full h-11 px-3.5 bg-[#f0f4f1] border border-[#e6eae7] rounded-[14px] text-[#121a16]"
                  placeholder="2000"
                  placeholderTextColor="#7a847e"
                />
              </View>

              {/* Daily Budget Target */}
              <View className="mb-4">
                <AppText weight="semibold" className="text-xs text-[#121a16] mb-1.5">
                  Anggaran belanja harian (IDR)
                </AppText>
                <TextInput
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  keyboardType="numeric"
                  style={{ fontSize: 16 }}
                  className="w-full h-11 px-3.5 bg-[#f0f4f1] border border-[#e6eae7] rounded-[14px] text-[#121a16]"
                  placeholder="50000"
                  placeholderTextColor="#7a847e"
                />
              </View>

              {/* Dietary Restrictions */}
              <View className="mb-4">
                <AppText weight="semibold" className="text-xs text-[#121a16] mb-2">
                  Pola diet khusus
                </AppText>
                <View className="flex-row flex-wrap gap-1.5">
                  {DIETARY_RESTRICTION_OPTIONS.map((opt) => {
                    const isSelected = selectedRestrictions.includes(opt);
                    return (
                      <PressableScale
                        key={opt}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedRestrictions(selectedRestrictions.filter((r) => r !== opt));
                          } else {
                            setSelectedRestrictions([...selectedRestrictions, opt]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full border ${
                          isSelected
                            ? "bg-[#141c18] border-[#141c18]"
                            : "bg-[#f0f4f1] border-[#e6eae7]"
                        }`}
                      >
                        <AppText
                          weight="semibold"
                          className={`text-xs ${isSelected ? "text-white" : "text-[#121a16]"}`}
                        >
                          {opt}
                        </AppText>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* Allergens */}
              <View className="mb-4">
                <AppText weight="semibold" className="text-xs text-[#121a16] mb-2">
                  Alergen yang dihindari
                </AppText>
                <View className="flex-row flex-wrap gap-1.5">
                  {COMMON_ALLERGENS.map((allergen) => {
                    const isSelected = selectedAllergies.includes(allergen);
                    return (
                      <PressableScale
                        key={allergen}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedAllergies(selectedAllergies.filter((a) => a !== allergen));
                          } else {
                            setSelectedAllergies([...selectedAllergies, allergen]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full border ${
                          isSelected
                            ? "bg-[#f3b23c] border-[#f3b23c]"
                            : "bg-[#f0f4f1] border-[#e6eae7]"
                        }`}
                      >
                        <AppText
                          weight="semibold"
                          className={`text-xs ${isSelected ? "text-[#1b1406]" : "text-[#121a16]"}`}
                        >
                          {allergen}
                        </AppText>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* Available Pantry Ingredients */}
              <View className="mb-5">
                <AppText weight="semibold" className="text-xs text-[#121a16] mb-1.5">
                  Bahan dapur yang tersedia (pisahkan dengan koma)
                </AppText>
                <TextInput
                  value={pantryInput}
                  onChangeText={setPantryInput}
                  style={{ fontSize: 16 }}
                  className="w-full h-11 px-3.5 bg-[#f0f4f1] border border-[#e6eae7] rounded-[14px] text-[#121a16]"
                  placeholder="Contoh: Telur, Tempe, Alpukat, Dada Ayam"
                  placeholderTextColor="#7a847e"
                />
              </View>
            </ScrollView>

            <View className="pt-4 border-t border-[#e6eae7] flex-row justify-end gap-2.5">
              <PillButton
                label="Batal"
                variant="soft"
                onPress={() => setPreferenceModalOpen(false)}
              />
              <PillButton
                label={isGenerating ? "Menyusun..." : "Susun jadwal baru"}
                variant="primary"
                icon={<LineIcon name="sparkle" size={14} color="#ffffff" />}
                onPress={handleGenerateSubmit}
                disabled={isGenerating}
              />
            </View>
          </FadeInView>
        </View>
      )}

      {/* Substitution Modal */}
      {substitutionModal.isOpen && (
        <View className="absolute inset-0 bg-[#121a16]/50 items-center justify-center px-4 py-8 z-50">
          <FadeInView
            duration={220}
            translateY={12}
            style={{ boxShadow: SURFACE_SHADOW } as any}
            className="w-full max-w-[480px] bg-[#fbfdfc] rounded-[24px] border border-[#e6eae7] p-5 max-h-[85%] flex-col"
          >
            <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-[#e6eae7] gap-2">
              <View className="flex-1 min-w-0">
                <AppText weight="semibold" className="text-base text-[#121a16]">
                  Ganti menu {substitutionModal.slot}
                </AppText>
                <AppText weight="regular" className="text-xs text-[#56605a]">
                  Pilih hidangan pengganti yang sesuai dengan filter alergi Anda
                </AppText>
              </View>
              <RingButton
                onPress={closeSubstitutionModal}
                accessibilityLabel="Tutup modal pengganti"
              >
                <LineIcon name="close" size={16} color="#121a16" />
              </RingButton>
            </View>

            {substitutionModal.isLoading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#0e7a52" />
                <AppText weight="medium" className="text-xs text-[#56605a] mt-2">
                  Mencari alternatif resep...
                </AppText>
              </View>
            ) : substitutionModal.candidates.length === 0 ? (
              <View className="py-10 items-center">
                <AppText weight="regular" className="text-xs text-[#56605a] text-center">
                  Tidak ada resep alternatif yang cocok dengan filter alergi dan diet untuk sesi makan ini.
                </AppText>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {substitutionModal.candidates.map((cand, idx) => (
                  <ListRow
                    key={idx}
                    first={idx === 0}
                    last={idx === substitutionModal.candidates.length - 1}
                    title={cand.recipe.title}
                    subtitle={`${cand.recipe.calories} kcal · ${formatIdr(cand.recipe.estimatedCostIdr || 0)} (${cand.calorieDiff > 0 ? `+${cand.calorieDiff}` : cand.calorieDiff} kcal)`}
                    right={
                      <PillButton
                        label="Pilih"
                        size="sm"
                        variant="primary"
                        onPress={() => replaceMeal(cand.recipe.id)}
                      />
                    }
                  />
                ))}
              </ScrollView>
            )}
          </FadeInView>
        </View>
      )}
    </ScreenWrapper>
  );
}
