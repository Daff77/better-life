import React, { useState } from "react";
import { View, Image, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  Button,
  Header,
  NutritionCard,
  MealLogModal,
  PressableScale,
  FadeInView,
} from "@/components/ui";
import { MOCK_RECIPES } from "@/data/mockRecipes";
import { IconRenderer, CrownIconSvg } from "@/constants/Assets";
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
      <ScreenWrapper className="flex-1 bg-[#faf9f5] items-center justify-center">
        <ActivityIndicator size="large" color="#153e28" />
        <AppText weight="medium" className="text-sm text-neutral-muted mt-3">
          Memuat detail resep...
        </AppText>
      </ScreenWrapper>
    );
  }

  if (!recipe) {
    return (
      <ScreenWrapper className="flex-1 bg-[#faf9f5]">
        <Header onBack={() => router.back()} title="Resep tidak ditemukan" />
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-14 h-14 rounded-2xl bg-status-error/10 items-center justify-center mb-4">
            <AppText weight="bold" className="text-2xl text-status-error">
              !
            </AppText>
          </View>
          <AppText weight="extrabold" className="text-xl text-neutral-dark mb-1 text-center">
            Resep tidak tersedia
          </AppText>
          <AppText weight="medium" className="text-sm text-neutral-muted text-center mb-6 max-w-xs">
            Resep yang Anda cari tidak ditemukan atau telah dipindahkan.
          </AppText>
          <Button
            title="Lihat semua resep"
            variant="primary"
            onPress={() => router.replace("/(app)/(tabs)/recipes")}
            accessibilityLabel="Kembali ke katalog resep"
          />
        </View>
      </ScreenWrapper>
    );
  }

  const diffLabel = DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty;

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#faf9f5]">
      <Header
        onBack={() => router.back()}
        title={recipe.title}
        subtitle={`${mealLabel(recipe.category)} · ${recipe.prepTimeMinutes} mnt · ${diffLabel}`}
      />

      <ScrollView
        className="flex-1 pt-2"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 96 : 116 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-col lg:flex-row lg:gap-8 mt-1">
          {/* Left Column: Hero Art + Cost + Nutrition + Desktop Action */}
          <FadeInView index={0} className="w-full lg:w-5/12">
            <View className="w-full h-60 lg:h-76 bg-[#f2f1ec] rounded-[24px] items-center justify-center my-2 overflow-hidden border border-black/[0.06]">
              {recipe.imageUrl ? (
                <Image
                  source={{ uri: recipe.imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <IconRenderer name={recipe.svgIcon} size={160} />
              )}
            </View>

            {recipe.estimatedCostIdr !== undefined && (
              <View className="my-3 bg-white p-3.5 rounded-2xl border border-[#ebe9e2] flex-row items-center justify-between">
                <View>
                  <AppText weight="bold" className="text-xs text-neutral-dark">
                    Estimasi harga bahan
                  </AppText>
                  <AppText weight="medium" className="text-[11px] text-neutral-muted">
                    Rata-rata pasar lokal per porsi
                  </AppText>
                </View>
                <AppText
                  weight="black"
                  className="text-sm text-primary"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  Rp {recipe.estimatedCostIdr.toLocaleString("id-ID")}
                </AppText>
              </View>
            )}

            <NutritionCard
              proteinGrams={recipe.nutrition.proteinGrams}
              carbsGrams={recipe.nutrition.carbsGrams}
              fatGrams={recipe.nutrition.fatGrams}
              fiberGrams={recipe.nutrition.fiberGrams}
              totalCalories={recipe.calories}
              className="mb-6"
            />

            <View className="hidden lg:flex mb-8">
              <Button
                title={`Catat ke jurnal (${recipe.calories} kcal)`}
                variant="primary"
                onPress={() => setIsLogModalVisible(true)}
                accessibilityLabel={`Catat ${recipe.title} ke jurnal`}
              />
            </View>
          </FadeInView>

          {/* Right Column: Cooking Tabs, Steps, Ingredients */}
          <FadeInView index={1} className="w-full lg:w-7/12">
            <View className="flex-row bg-[#efeee8] rounded-2xl p-1 mb-5">
              <PressableScale
                onPress={() => setActiveTab("instructions")}
                pressedScale={0.98}
                className={`flex-1 py-2.5 items-center justify-center rounded-xl ${
                  activeTab === "instructions" ? "bg-white" : ""
                }`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "instructions" }}
              >
                <AppText
                  weight={activeTab === "instructions" ? "bold" : "medium"}
                  className={`text-sm ${
                    activeTab === "instructions" ? "text-primary" : "text-neutral-muted"
                  }`}
                >
                  Langkah memasak
                </AppText>
              </PressableScale>

              <PressableScale
                onPress={() => setActiveTab("ingredients")}
                pressedScale={0.98}
                className={`flex-1 py-2.5 items-center justify-center rounded-xl ${
                  activeTab === "ingredients" ? "bg-white" : ""
                }`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "ingredients" }}
              >
                <AppText
                  weight={activeTab === "ingredients" ? "bold" : "medium"}
                  className={`text-sm ${
                    activeTab === "ingredients" ? "text-primary" : "text-neutral-muted"
                  }`}
                >
                  Bahan ({recipe.ingredients.length})
                </AppText>
              </PressableScale>
            </View>

            {activeTab === "instructions" && (
              <View className="gap-y-3 mb-6">
                {isLocked && (
                  <View className="p-4 rounded-2xl bg-[#fdf3e3] border border-[#f5e3ba] gap-2">
                    <View className="flex-row items-center gap-2">
                      <CrownIconSvg size={17} color="#b45309" />
                      <AppText weight="bold" className="text-sm text-[#8a4106]">
                        Koleksi Resep Premium
                      </AppText>
                    </View>
                    <AppText weight="medium" className="text-xs text-[#8a4106] leading-relaxed">
                      Aktifkan Better Life Premium untuk membuka panduan memasak lengkap dan takaran presisi.
                    </AppText>
                    <PressableScale
                      onPress={() => router.push("/(app)/upgrade")}
                      className="self-start px-4 py-2 rounded-full bg-primary mt-1"
                      accessibilityRole="button"
                      accessibilityLabel="Lihat paket Premium"
                    >
                      <AppText weight="bold" className="text-xs text-white">
                        Lihat paket Premium
                      </AppText>
                    </PressableScale>
                  </View>
                )}

                {recipe.instructions.map((step) => (
                  <View
                    key={step.step}
                    className="flex-row items-start bg-white p-4 rounded-2xl border border-[#ebe9e2]"
                  >
                    <View className="w-7 h-7 rounded-full bg-primary-light items-center justify-center mr-3.5 mt-0.5">
                      <AppText weight="bold" className="text-xs text-primary" style={{ fontVariant: ["tabular-nums"] }}>
                        {step.step}
                      </AppText>
                    </View>

                    <View className="flex-1">
                      <AppText weight="medium" className="text-sm text-neutral-dark leading-relaxed">
                        {step.text}
                      </AppText>

                      {Boolean(step.timerMinutes) && (
                        <View className="flex-row items-center mt-2.5 bg-[#f4f3ee] px-2.5 py-1 rounded-md self-start">
                          <IconRenderer name="Clock" size={12} color="#153e28" />
                          <AppText
                            weight="bold"
                            className="text-xs text-primary ml-1.5"
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
            )}

            {activeTab === "ingredients" && (
              <View className="bg-white rounded-2xl border border-[#ebe9e2] px-4 mb-6">
                {recipe.ingredients.map((ing, idx) => (
                  <View
                    key={idx}
                    className={`flex-row items-center justify-between py-3.5 ${
                      idx > 0 ? "border-t border-[#f0eee8]" : ""
                    }`}
                  >
                    <AppText weight="semibold" className="text-sm text-neutral-dark">
                      {ing.name}
                    </AppText>
                    <AppText
                      weight="bold"
                      className="text-xs text-primary"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {ing.amount}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </FadeInView>
        </View>
      </ScrollView>

      {/* Sticky Bottom Dock for Mobile */}
      <View
        className="lg:hidden px-5 pt-3 bg-white border-t border-[#ebe9e2]"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <View className="flex-row items-center justify-between gap-3 max-w-md mx-auto w-full">
          <View className="flex-1">
            <AppText
              weight="black"
              className="text-lg text-neutral-dark"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {recipe.calories} kcal
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              {recipe.prepTimeMinutes} mnt · {diffLabel}
            </AppText>
          </View>
          <View className="w-44">
            <Button
              title="Catat ke jurnal"
              variant="primary"
              onPress={() => setIsLogModalVisible(true)}
              accessibilityLabel={`Catat ${recipe.title} ke jurnal`}
              className="min-h-[46px]"
            />
          </View>
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
