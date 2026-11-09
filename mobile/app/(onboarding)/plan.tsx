import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  AppText,
  Button,
  FlowScreen,
  FlowTitle,
  Surface,
  CardHead,
  StatusPill,
  ColorBlock,
  MixBar,
  ListRow,
  RowIcon,
  LineIcon,
} from "@/components/ui";
import { useOnboardingStore } from "@/stores/useOnboardingStore";

const GOAL_LABELS: Record<string, string> = {
  "Eat balanced": "Makan Seimbang",
  "Lose weight": "Turunkan Berat Badan",
  "Gain muscle": "Bentuk Otot",
};

const SKILL_LABELS: Record<string, string> = {
  Low: "Pemula (≤ 15 mnt)",
  Middle: "Menengah",
  High: "Mahir",
};

export default function PersonalizedPlanScreen() {
  const router = useRouter();
  const personalization = useOnboardingStore((state) => state.personalization);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleStartJourney = async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    try {
      await completeOnboarding();
      setIsCompleting(false);
      router.replace("/(app)/(tabs)");
    } catch {
      setIsCompleting(false);
      router.replace("/(app)/(tabs)");
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(onboarding)");
    }
  };

  const getGoalExplanation = () => {
    switch (personalization.goal) {
      case "Lose weight":
        return "Dikalibrasi dengan defisit kalori aman ~18% untuk membakar lemak tubuh sambil menjaga massa otot.";
      case "Gain muscle":
        return "Dikalibrasi dengan surplus kalori ~15% untuk mendukung latihan beban dan sintesis protein otot.";
      case "Eat balanced":
      default:
        return "Dikalibrasi untuk keseimbangan metabolisme dan energi harian yang stabil.";
    }
  };

  const targetCalories = personalization.targetCalories || 2000;
  const bmr = personalization.bmr || Math.round(targetCalories * 0.74);
  const tdee = personalization.tdee || targetCalories;
  const proteinGrams = personalization.targetProteinGrams || Math.round((targetCalories * 0.25) / 4);
  const carbGrams = personalization.targetCarbGrams || Math.round((targetCalories * 0.5) / 4);
  const fatGrams = personalization.targetFatGrams || Math.round((targetCalories * 0.25) / 9);

  return (
    <FlowScreen
      onBack={handleBack}
      step={{ current: 8, total: 8 }}
      footer={
        <Button
          title={isCompleting ? "Menyiapkan Beranda..." : "Mulai Perjalanan Better Life"}
          size="lg"
          loading={isCompleting}
          onPress={handleStartJourney}
          accessibilityLabel="Mulai perjalanan dan masuk ke beranda"
        />
      }
    >
      <FlowTitle
        eyebrow="Langkah 8 dari 8 · Hasil Personalisasi"
        title="Rencana Nutrisi Harian Anda"
        caption={getGoalExplanation()}
      />

      <View className="gap-4">
        {/* Hero Calorie Target Card */}
        <ColorBlock tone="green">
          <View className="flex-row justify-between items-center mb-1.5">
            <AppText weight="bold" className="text-[11.5px] uppercase tracking-wider text-white/80">
              Target Kalori Harian
            </AppText>
            <View className="px-2.5 py-0.5 rounded-full bg-white/15">
              <AppText weight="semibold" className="text-[11px] text-white">
                {GOAL_LABELS[personalization.goal] || personalization.goal}
              </AppText>
            </View>
          </View>

          <View className="my-1.5">
            <View className="flex-row items-baseline">
              <AppText
                weight="bold"
                className="text-[44px] text-white"
                style={{ fontVariant: ["tabular-nums"], letterSpacing: -1.2, lineHeight: 48 }}
              >
                {targetCalories.toLocaleString("id-ID")}
              </AppText>
              <AppText weight="medium" className="text-[15px] text-white/85 ml-2">
                kcal / hari
              </AppText>
            </View>
            <AppText weight="regular" className="text-[12px] text-white/75 mt-1">
              Dihitung dengan rumus metabolisme basal Mifflin-St Jeor
            </AppText>
          </View>

          <View className="flex-row justify-between pt-3 mt-2.5 border-t border-white/20">
            <View className="flex-1">
              <AppText weight="regular" className="text-[11px] text-white/75">
                Metabolisme Basal (BMR)
              </AppText>
              <AppText
                weight="semibold"
                className="text-[14px] text-white mt-0.5"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {bmr.toLocaleString("id-ID")} kcal
              </AppText>
            </View>
            <View className="flex-1">
              <AppText weight="regular" className="text-[11px] text-white/75">
                Kebutuhan Total (TDEE)
              </AppText>
              <AppText
                weight="semibold"
                className="text-[14px] text-white mt-0.5"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {tdee.toLocaleString("id-ID")} kcal
              </AppText>
            </View>
            <View className="items-end">
              <AppText weight="regular" className="text-[11px] text-white/75">
                Tubuh
              </AppText>
              <AppText
                weight="semibold"
                className="text-[14px] text-[#f3b23c] mt-0.5"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {personalization.weight}kg · {personalization.height}cm
              </AppText>
            </View>
          </View>
        </ColorBlock>

        {/* Macronutrient Recommendations */}
        <Surface>
          <CardHead
            title="Rekomendasi makronutrisi"
            subtitle="Proporsi harian untuk energi dan pemulihan"
          />

          <MixBar
            height={12}
            segments={[
              { key: "p", value: 25, color: "#0e7a52" },
              { key: "c", value: 50, color: "#f3b23c" },
              { key: "f", value: 25, color: "#141c18" },
            ]}
          />

          <View className="mt-2">
            <ListRow
              first
              left={
                <RowIcon tone="green">
                  <LineIcon name="flame" size={15} color="#0e7a52" />
                </RowIcon>
              }
              title="Protein (25%)"
              subtitle="Pemulihan jaringan & sintesis otot"
              right={
                <AppText
                  weight="bold"
                  className="text-[15px] text-primary-text"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {proteinGrams} g
                </AppText>
              }
            />
            <ListRow
              left={
                <RowIcon tone="amber">
                  <LineIcon name="sparkle" size={15} color="#8f4e00" />
                </RowIcon>
              }
              title="Karbohidrat (50%)"
              subtitle="Sumber energi utama aktivitas harian"
              right={
                <AppText
                  weight="bold"
                  className="text-[15px] text-ink"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {carbGrams} g
                </AppText>
              }
            />
            <ListRow
              last
              left={
                <RowIcon tone="soft">
                  <LineIcon name="heart" size={15} color="#121a16" />
                </RowIcon>
              }
              title="Lemak Sehat (25%)"
              subtitle="Keseimbangan hormon & penyerapan vitamin"
              right={
                <AppText
                  weight="bold"
                  className="text-[15px] text-ink"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {fatGrams} g
                </AppText>
              }
            />
          </View>
        </Surface>

        {/* Personal Dietary & Skill Profile */}
        <Surface>
          <CardHead
            title="Profil preferensi Anda"
            subtitle="Digunakan untuk memfilter katalog resep & rencana makan"
          />
          <ListRow
            first
            left={
              <RowIcon tone="green">
                <LineIcon name="leaf" size={15} color="#0e7a52" />
              </RowIcon>
            }
            title="Pola makan"
            right={<StatusPill tone="ok" label={personalization.dietType || "Omnivore"} />}
          />
          <ListRow
            left={
              <RowIcon tone="soft">
                <LineIcon name="utensils" size={15} color="#121a16" />
              </RowIcon>
            }
            title="Keahlian memasak"
            right={
              <AppText weight="semibold" className="text-[13px] text-ink">
                {SKILL_LABELS[personalization.cookingSkill] || personalization.cookingSkill}
              </AppText>
            }
          />
          <ListRow
            last
            left={
              <RowIcon tone="amber">
                <LineIcon name="shield" size={15} color="#8f4e00" />
              </RowIcon>
            }
            title="Alergen yang dikecualikan"
            right={
              <AppText weight="semibold" className="text-[13px] text-ink">
                {personalization.allergies && personalization.allergies.length > 0
                  ? personalization.allergies.join(", ")
                  : "Tidak ada"}
              </AppText>
            }
          />
        </Surface>
      </View>
    </FlowScreen>
  );
}
