import React from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Button, Card, Badge } from "@/components/ui";
import { useOnboardingStore } from "@/stores/useOnboardingStore";

export default function PersonalizedPlanScreen() {
  const router = useRouter();
  const personalization = useOnboardingStore((state) => state.personalization);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);

  const handleStartJourney = async () => {
    // Complete onboarding state and persist session
    await completeOnboarding();
    // Navigate to Main Application Dashboard
    router.replace("/(app)/(tabs)");
  };

  const getGoalExplanation = () => {
    switch (personalization.goal) {
      case "Lose weight":
        return "Calibrated with a safe ~18% caloric deficit to burn body fat while preserving lean muscle.";
      case "Gain muscle":
        return "Calibrated with a ~15% caloric surplus to support resistance training and muscle protein synthesis.";
      case "Eat balanced":
      default:
        return "Calibrated for metabolic equilibrium and steady daily energy levels.";
    }
  };

  return (
    <ScreenWrapper maxWidth="default" className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 pt-6 pb-8"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View className="mb-6">
          <View className="flex-row items-center gap-x-2 mb-2">
            <View className="bg-primary/20 px-3 py-1 rounded-full">
              <AppText weight="bold" className="text-xs text-primary uppercase tracking-wide">
                Personalized Blueprint
              </AppText>
            </View>
          </View>
          <AppText weight="black" className="text-3xl text-neutral-dark mb-1">
            Your Better Life Plan
          </AppText>
          <AppText weight="medium" className="text-sm text-neutral-muted leading-relaxed">
            {getGoalExplanation()}
          </AppText>
        </View>

        {/* Main Content Layout: Single column on mobile, 2 columns on desktop */}
        <View className="md:flex-row md:gap-8 items-start">
          {/* Left Column on Desktop: Target Calories & Dietary Profile */}
          <View className="w-full md:flex-1">
            {/* Hero Target Calories Card */}
            <View className="mb-5">
              <View className="bg-secondary-soft p-6 rounded-3xl border border-secondary shadow-sm">
                <View className="flex-row justify-between items-center mb-3">
                  <AppText weight="extrabold" className="text-xs uppercase tracking-wider text-accent-teal">
                    Daily Calorie Target
                  </AppText>
                  <Badge label="Optimal" variant="primary" size="sm" />
                </View>

                <View className="items-center my-3">
                  <View className="flex-row items-baseline">
                    <AppText weight="black" className="text-5xl text-primary">
                      {personalization.targetCalories}
                    </AppText>
                    <AppText weight="bold" className="text-xl text-neutral-muted ml-1.5">
                      kcal / day
                    </AppText>
                  </View>
                  <AppText weight="medium" className="text-xs text-neutral-muted mt-2 text-center">
                    Derived via Mifflin-St Jeor metabolic expenditure formula
                  </AppText>
                </View>

                {/* Metabolic Factors Strip */}
                <View className="flex-row justify-between pt-4 mt-2 border-t border-secondary">
                  <View className="items-center flex-1">
                    <AppText weight="medium" className="text-xs text-neutral-muted">
                      Basal (BMR)
                    </AppText>
                    <AppText weight="bold" className="text-sm text-neutral-dark mt-0.5">
                      {personalization.bmr || "—"} kcal
                    </AppText>
                  </View>
                  <View className="w-px h-8 bg-secondary" />
                  <View className="items-center flex-1">
                    <AppText weight="medium" className="text-xs text-neutral-muted">
                      Total (TDEE)
                    </AppText>
                    <AppText weight="bold" className="text-sm text-neutral-dark mt-0.5">
                      {personalization.tdee || "—"} kcal
                    </AppText>
                  </View>
                  <View className="w-px h-8 bg-secondary" />
                  <View className="items-center flex-1">
                    <AppText weight="medium" className="text-xs text-neutral-muted">
                      Target Goal
                    </AppText>
                    <AppText weight="bold" className="text-sm text-primary mt-0.5">
                      {personalization.goal}
                    </AppText>
                  </View>
                </View>
              </View>
            </View>

            {/* Dietary Preferences & Exclusions Strip */}
            <View className="mb-6">
              <AppText weight="bold" className="text-base text-neutral-dark mb-2.5">
                Dietary Profile
              </AppText>

              <View className="p-4 bg-white rounded-2xl border border-neutral-border shadow-xs">
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-border/60">
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Dietary Preference
                  </AppText>
                  <View className="bg-primary/10 px-2.5 py-0.5 rounded-full">
                    <AppText weight="bold" className="text-xs text-primary">
                      {personalization.dietType || "Standard"}
                    </AppText>
                  </View>
                </View>

                <View className="flex-row justify-between items-center pt-2.5">
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Excluded Allergens
                  </AppText>
                  <View className="flex-row flex-wrap gap-1 justify-end max-w-[60%]">
                    {personalization.allergies && personalization.allergies.length > 0 ? (
                      personalization.allergies.map((allergy) => (
                        <View key={allergy} className="bg-status-error/10 px-2 py-0.5 rounded-full">
                          <AppText weight="bold" className="text-[11px] text-status-error">
                            {allergy}
                          </AppText>
                        </View>
                      ))
                    ) : (
                      <AppText weight="bold" className="text-xs text-neutral-dark">
                        None declared
                      </AppText>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column on Desktop: Macronutrients & Call to Action */}
          <View className="w-full md:flex-1 md:bg-white md:p-6 md:rounded-3xl md:border md:border-neutral-border-light md:shadow-sm">
            {/* Macronutrient Distribution */}
            <View className="mb-6">
              <AppText weight="bold" className="text-base text-neutral-dark mb-3">
                Recommended Daily Macronutrients
              </AppText>

              <View className="flex-row gap-x-3">
                {/* Protein Card */}
                <View className="flex-1 bg-neutral-surface p-4 rounded-2xl border border-neutral-border items-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mb-1.5" />
                  <AppText weight="bold" className="text-xs text-neutral-muted">
                    Protein (25%)
                  </AppText>
                  <AppText weight="black" className="text-xl text-neutral-dark mt-1">
                    {personalization.targetProteinGrams || 120}g
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Muscle recovery
                  </AppText>
                </View>

                {/* Carbohydrates Card */}
                <View className="flex-1 bg-neutral-surface p-4 rounded-2xl border border-neutral-border items-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-amber-500 mb-1.5" />
                  <AppText weight="bold" className="text-xs text-neutral-muted">
                    Carbs (50%)
                  </AppText>
                  <AppText weight="black" className="text-xl text-neutral-dark mt-1">
                    {personalization.targetCarbGrams || 240}g
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Primary energy
                  </AppText>
                </View>

                {/* Healthy Fats Card */}
                <View className="flex-1 bg-neutral-surface p-4 rounded-2xl border border-neutral-border items-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mb-1.5" />
                  <AppText weight="bold" className="text-xs text-neutral-muted">
                    Fats (25%)
                  </AppText>
                  <AppText weight="black" className="text-xl text-neutral-dark mt-1">
                    {personalization.targetFatGrams || 54}g
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    Hormonal balance
                  </AppText>
                </View>
              </View>
            </View>

            {/* Bottom CTA Action */}
            <View className="mt-auto pt-4 pb-2">
              <Button
                title="Start My Journey"
                variant="primary"
                onPress={handleStartJourney}
                accessibilityLabel="Start my journey and enter dashboard"
                className="w-full shadow-md"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
