import React, { useState } from "react";
import { View, Image, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  Header,
  NutritionCard,
  MealLogModal,
  PressableScale,
  FadeInView,
  Surface,
  CardHead,
  StatusPill,
  Segmented,
  ListRow,
  RowIcon,
  PillButton,
  ColorBlock,
  LineIcon,
  SURFACE_SHADOW,
} from "@/components/ui";
import { MOCK_RECIPES } from "@/data/mockRecipes";
import { getMealIllustration } from "@/constants/Assets";
import { mealLabel, DIFFICULTY_LABELS } from "@/constants/MealLabels";
import { useRecipe } from "@/hooks/useRecipesQuery";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { Entitlement } from "@/lib/subscriptionDomain";

export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: queriedRecipe, isLoading } = useRecipe(id || "");

  const hasEntitlement = useSubscriptionStore((state) => state.hasEntitlement);
  const [activeTab, setActiveTab] = useState<"instructions" | "ingredients">("instructions");
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  const recipe = queriedRecipe || MOCK_RECIPES.find((r) => r.id === id) || (id ? null : MOCK_RECIPES[0]);
  const isLocked = Boolean((recipe as any)?.isPremium && !hasEntitlement(Entitlement.PREMIUM_RECIPES));

  if (isLoading && !recipe) {
    return (
      <ScreenWrapper className="flex-1 bg-[#edf1ee] items-center justify-center">
        <ActivityIndicator size="large" color="#0e7a52" />
        <AppText weight="medium" className="text-sm text-[#56605a] mt-3">
          Memuat detail resep...
        </AppText>
      </ScreenWrapper>
    );
  }

  if (!recipe) {
    return (
      <ScreenWrapper className="flex-1 bg-[#edf1ee]">
        <Header onBack={() => router.back()} title="Resep tidak ditemukan" />
        <View className="flex-1 items-center justify-center p-6">
          <Surface className="items-center max-w-sm w-full py-8">
            <View className="w-12 h-12 rounded-2xl bg-[#fde9e7] items-center justify-center mb-3">
              <LineIcon name="alert" size={22} color="#b92d26" />
            </View>
            <AppText weight="bold" className="text-lg text-[#121a16] mb-1 text-center">
              Resep tidak tersedia
            </AppText>
            <AppText weight="regular" className="text-xs text-[#56605a] text-center mb-5 max-w-xs leading-relaxed">
              Resep yang Anda cari tidak ditemukan atau telah dipindahkan dari katalog.
            </AppText>
            <PillButton
              label="Lihat semua resep"
              variant="primary"
              onPress={() => router.replace("/(app)/(tabs)/recipes")}
              accessibilityLabel="Kembali ke katalog resep"
            />
          </Surface>
        </View>
      </ScreenWrapper>
    );
  }

  const diffLabel = DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty;

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#edf1ee]">
      <Header
        onBack={() => router.back()}
        title={recipe.title}
        subtitle={`${mealLabel(recipe.category)} · ${recipe.prepTimeMinutes} mnt · ${diffLabel}`}
        rightComponent={
          <StatusPill
            tone={(recipe as any)?.isPremium ? "warn" : "ok"}
            label={(recipe as any)?.isPremium ? "Koleksi Chef" : mealLabel(recipe.category)}
          />
        }
      />

      <ScrollView
        className="flex-1 pt-1"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 96 : 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-col lg:flex-row lg:gap-5 mt-1">
          {/* Left Column: Hero Art + Cost + Nutrition + Desktop Action */}
          <FadeInView index={0} className="w-full lg:w-5/12 gap-4 mb-4 lg:mb-0">
            <Surface noPadding className="overflow-hidden">
              <View className="w-full h-56 sm:h-64 lg:h-72 bg-[#f0f4f1] items-center justify-center relative overflow-hidden">
                <Image
                  source={
                    recipe.imageUrl
                      ? { uri: recipe.imageUrl }
                      : getMealIllustration(recipe.category || recipe.svgIcon)
                  }
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />

                <View className="absolute top-3.5 left-3.5 flex-row items-center gap-1.5">
                  <View className="px-3 py-1 rounded-full bg-[#121a16]/85">
                    <AppText
                      weight="bold"
                      className="text-xs text-white"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {recipe.calories} kcal
                    </AppText>
                  </View>
                  <View className="px-2.5 py-1 rounded-full bg-[#fbfdfc]/92 border border-[#e6eae7] flex-row items-center gap-1">
                    <LineIcon name="clock" size={12} color="#121a16" />
                    <AppText
                      weight="semibold"
                      className="text-[11px] text-[#121a16]"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {recipe.prepTimeMinutes} mnt
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Quick recipe metadata strip */}
              <View className="p-4 flex-row items-center justify-between border-t border-[#e6eae7] bg-[#fbfdfc] gap-2">
                <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                  <RowIcon tone="soft">
                    <LineIcon name="wallet" size={16} color="#0e7a52" />
                  </RowIcon>
                  <View className="flex-1 min-w-0">
                    <AppText weight="semibold" className="text-[13px] text-[#121a16]">
                      Estimasi biaya bahan
                    </AppText>
                    <AppText weight="regular" className="text-[11px] text-[#56605a]">
                      Rata-rata pasar lokal per porsi
                    </AppText>
                  </View>
                </View>
                <AppText
                  weight="bold"
                  className="text-[15px] text-[#0e7a52] flex-shrink-0"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {recipe.estimatedCostIdr !== undefined
                    ? `Rp ${recipe.estimatedCostIdr.toLocaleString("id-ID")}`
                    : "Terjangkau"}
                </AppText>
              </View>
            </Surface>

            <NutritionCard
              proteinGrams={recipe.nutrition.proteinGrams}
              carbsGrams={recipe.nutrition.carbsGrams}
              fatGrams={recipe.nutrition.fatGrams}
              fiberGrams={recipe.nutrition.fiberGrams}
              totalCalories={recipe.calories}
            />

            <View className="hidden lg:flex">
              <PressableScale
                onPress={() => setIsLogModalVisible(true)}
                className="w-full py-3.5 px-5 rounded-full bg-[#0e7a52] flex-row items-center justify-center gap-2"
                accessibilityRole="button"
                accessibilityLabel={`Catat ${recipe.title} ke jurnal`}
              >
                <LineIcon name="plus" size={16} color="#ffffff" />
                <AppText
                  weight="semibold"
                  className="text-sm text-white"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  Catat ke jurnal ({recipe.calories} kcal)
                </AppText>
              </PressableScale>
            </View>
          </FadeInView>

          {/* Right Column: Cooking Tabs, Steps, Ingredients */}
          <FadeInView index={1} className="w-full lg:w-7/12 gap-4">
            {isLocked && (
              <ColorBlock tone="amber">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <LineIcon name="crown" size={15} color="#1b1406" />
                      <AppText weight="bold" className="text-[11px] uppercase tracking-wider text-[#1b1406]/75">
                        Koleksi Resep Premium
                      </AppText>
                    </View>
                    <AppText weight="semibold" className="text-base text-[#1b1406] mb-1">
                      Buka takaran presisi & panduan chef
                    </AppText>
                    <AppText weight="regular" className="text-xs text-[#1b1406]/80 leading-relaxed mb-3">
                      Aktifkan Better Life Premium untuk membuka koleksi resep chef lengkap beserta analisis makronutrisi mendalam.
                    </AppText>
                    <View className="self-start">
                      <PillButton
                        label="Lihat paket Premium"
                        variant="dark"
                        onPress={() => router.push("/(app)/upgrade")}
                        accessibilityLabel="Lihat paket Premium"
                      />
                    </View>
                  </View>
                </View>
              </ColorBlock>
            )}

            <Surface>
              <CardHead
                title={activeTab === "instructions" ? "Langkah memasak" : "Komposisi bahan"}
                subtitle={
                  activeTab === "instructions"
                    ? `${recipe.instructions.length} tahapan terstruktur`
                    : `${recipe.ingredients.length} bahan utama per porsi`
                }
              />

              <View className="mb-3.5">
                <Segmented
                  stretch
                  value={activeTab}
                  onChange={setActiveTab}
                  options={[
                    { value: "instructions", label: "Langkah memasak" },
                    { value: "ingredients", label: `Bahan (${recipe.ingredients.length})` },
                  ]}
                />
              </View>

              {activeTab === "instructions" ? (
                <View className="gap-3">
                  {recipe.instructions.map((step) => (
                    <View
                      key={step.step}
                      className="flex-row items-start bg-[#f0f4f1] p-3.5 rounded-[16px] border border-[#e6eae7]"
                    >
                      <View className="w-7 h-7 rounded-full bg-[#0e7a52] items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        <AppText
                          weight="bold"
                          className="text-xs text-white"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {step.step}
                        </AppText>
                      </View>

                      <View className="flex-1 min-w-0">
                        <AppText weight="regular" className="text-[13.5px] text-[#121a16] leading-relaxed">
                          {step.text}
                        </AppText>

                        {Boolean(step.timerMinutes) && (
                          <View className="flex-row items-center mt-2 bg-[#fbfdfc] border border-[#e6eae7] px-2.5 py-1 rounded-full self-start gap-1.5">
                            <LineIcon name="clock" size={12} color="#0e7a52" />
                            <AppText
                              weight="semibold"
                              className="text-[11px] text-[#0e7a52]"
                              style={{ fontVariant: ["tabular-nums"] }}
                            >
                              {step.timerMinutes} menit
                            </AppText>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View>
                  {recipe.ingredients.map((ing, idx) => (
                    <ListRow
                      key={idx}
                      first={idx === 0}
                      last={idx === recipe.ingredients.length - 1}
                      left={
                        <RowIcon tone="soft">
                          <LineIcon name="leaf" size={15} color="#0e7a52" />
                        </RowIcon>
                      }
                      title={ing.name}
                      subtitle="Takaran per 1 porsi saji"
                      right={
                        <View className="px-2.5 py-1 rounded-full bg-[#f0f4f1] border border-[#e6eae7] flex-shrink-0">
                          <AppText
                            weight="semibold"
                            className="text-xs text-[#121a16]"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {ing.amount}
                          </AppText>
                        </View>
                      }
                    />
                  ))}
                </View>
              )}
            </Surface>
          </FadeInView>
        </View>
      </ScrollView>

      {/* Sticky Bottom Dock for Mobile */}
      <View
        className="lg:hidden -mx-4 px-5 pt-3 bg-[#fbfdfc] border-t border-[#e6eae7]"
        style={[{ paddingBottom: Math.max(insets.bottom, 12) }, { boxShadow: SURFACE_SHADOW } as any]}
      >
        <View className="flex-row items-center justify-between gap-3 max-w-md mx-auto w-full">
          <View className="flex-1 min-w-0">
            <AppText
              weight="bold"
              className="text-lg text-[#121a16]"
              style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.4 }}
            >
              {recipe.calories} kcal
            </AppText>
            <AppText weight="regular" numberOfLines={1} className="text-xs text-[#56605a]">
              {recipe.prepTimeMinutes} mnt · {diffLabel}
            </AppText>
          </View>
          <PillButton
            label="Catat ke jurnal"
            variant="primary"
            icon={<LineIcon name="plus" size={15} color="#ffffff" />}
            onPress={() => setIsLogModalVisible(true)}
            accessibilityLabel={`Catat ${recipe.title} ke jurnal`}
          />
        </View>
      </View>

      <MealLogModal
        visible={isLogModalVisible}
        meal={recipe}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
