import React, { useState } from "react";
import { View, ViewProps, Modal, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "./AppText";
import { Surface, CardHead, MixBar, ListRow, RingButton, PillButton, StatusPill } from "./Surface";
import { Colors } from "@/constants/DesignTokens";
import { useOnboardingStore } from "@/stores/useOnboardingStore";

export interface NutritionCardProps extends ViewProps {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  totalCalories?: number;
  targetProteinGrams?: number;
  targetCarbsGrams?: number;
  targetFatGrams?: number;
  className?: string;
}

const MACRO = Colors.macros;
const tnum = { fontVariant: ["tabular-nums" as const] };

/**
 * Nutrition breakdown surface used on recipe detail and onboarding summary.
 * Shows the calorie figure, a proportional MixBar of macro calories, and ruled rows per macro.
 */
export const NutritionCard: React.FC<NutritionCardProps> = ({
  proteinGrams = 0,
  carbsGrams = 0,
  fatGrams = 0,
  fiberGrams,
  totalCalories,
  targetProteinGrams,
  targetCarbsGrams,
  targetFatGrams,
  className,
  style,
  ...props
}) => {
  const router = useRouter();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const profile = useOnboardingStore.getState().personalization;
  const activeTargetProtein = targetProteinGrams ?? profile?.targetProteinGrams ?? 161;
  const activeTargetCarbs = targetCarbsGrams ?? profile?.targetCarbGrams ?? 323;
  const activeTargetFat = targetFatGrams ?? profile?.targetFatGrams ?? 72;

  const proteinCalories = Math.round(proteinGrams * 4);
  const carbsCalories = Math.round(carbsGrams * 4);
  const fatCalories = Math.round(fatGrams * 9);
  const totalCalculatedKcal = proteinCalories + carbsCalories + fatCalories;
  const displayCalories = totalCalories || totalCalculatedKcal;

  const proteinPct = Math.round(((proteinCalories) / (totalCalculatedKcal || 1)) * 100);
  const carbsPct = Math.round(((carbsCalories) / (totalCalculatedKcal || 1)) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  const rows = [
    {
      key: "protein",
      label: "Protein",
      caption: `${proteinCalories} kcal · ${proteinPct}% energi`,
      grams: proteinGrams,
      target: activeTargetProtein,
      color: MACRO.protein,
    },
    {
      key: "carbs",
      label: "Karbohidrat",
      caption: `${carbsCalories} kcal · ${carbsPct}% energi`,
      grams: carbsGrams,
      target: activeTargetCarbs,
      color: MACRO.carbs,
    },
    {
      key: "fat",
      label: "Lemak sehat",
      caption: `${fatCalories} kcal · ${fatPct}% energi`,
      grams: fatGrams,
      target: activeTargetFat,
      color: MACRO.fat,
    },
    ...(fiberGrams !== undefined
      ? [
          {
            key: "fiber",
            label: "Serat pangan",
            caption: "Mendukung pencernaan & kenyang lebih lama",
            grams: fiberGrams,
            target: 25,
            color: MACRO.fiber,
          },
        ]
      : []),
  ];

  return (
    <Surface className={className} style={style} {...props}>
      <CardHead
        title="Komposisi nutrisi"
        caption="Rincian makronutrisi per porsi"
        right={
          <RingButton
            icon="arrowUpRight"
            accessibilityLabel="Lihat detail nutrisi"
            onPress={() => setIsDetailsModalOpen(true)}
          />
        }
      />

      <View className="flex-row items-baseline gap-2 mb-3">
        <AppText
          weight="semibold"
          className="text-[32px] text-ink"
          style={[tnum, { letterSpacing: -0.8, lineHeight: 36 }]}
        >
          {displayCalories.toLocaleString("id-ID")}
        </AppText>
        <AppText weight="medium" className="text-[13px] text-muted" style={tnum}>
          kcal per porsi · P {proteinPct}% · K {carbsPct}% · L {fatPct}%
        </AppText>
      </View>

      <MixBar
        height={38}
        accessibilityLabel={`Protein ${proteinCalories} kcal, karbohidrat ${carbsCalories} kcal, lemak ${fatCalories} kcal`}
        segments={[
          { key: "p", value: Math.max(1, proteinCalories), color: MACRO.protein },
          { key: "c", value: Math.max(1, carbsCalories), color: MACRO.carbs },
          { key: "f", value: Math.max(1, fatCalories), color: MACRO.fat },
        ]}
      />

      <View className="mt-2">
        {rows.map((r, i) => (
          <ListRow
            key={r.key}
            last={i === rows.length - 1}
            leading={<View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />}
            title={r.label}
            caption={r.caption}
            trailing={
              <AppText weight="bold" className="text-[15px] text-ink" style={tnum}>
                {r.grams} g
              </AppText>
            }
          />
        ))}
      </View>

      <Modal
        visible={isDetailsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDetailsModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center p-4">
          <Pressable
            onPress={() => setIsDetailsModalOpen(false)}
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(18, 24, 20, 0.45)" }]}
          />
          <Surface className="w-full max-w-md z-10">
            <CardHead
              title="Detail makronutrisi"
              caption="Kontribusi terhadap target harian Anda"
              right={
                <RingButton
                  icon="close"
                  accessibilityLabel="Tutup detail nutrisi"
                  onPress={() => setIsDetailsModalOpen(false)}
                />
              }
            />

            <View className="flex-row items-center justify-between py-2.5 px-3.5 rounded-2xl bg-card-2 mb-3">
              <View>
                <AppText weight="medium" className="text-[12px] text-muted">
                  Energi per porsi
                </AppText>
                <AppText weight="bold" className="text-[22px] text-ink" style={tnum}>
                  {displayCalories} kcal
                </AppText>
              </View>
              {fiberGrams !== undefined && (
                <StatusPill label={`Serat ${fiberGrams} g`} tone="accent" />
              )}
            </View>

            <View>
              {rows.map((r, idx) => {
                const goalPct = r.target > 0 ? Math.round((r.grams / r.target) * 100) : 0;
                return (
                  <ListRow
                    key={r.key}
                    last={idx === rows.length - 1}
                    leading={<View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />}
                    title={r.label}
                    caption={`${goalPct}% dari target harian (${r.target} g)`}
                    trailing={
                      <AppText weight="bold" className="text-[14px] text-ink" style={tnum}>
                        {r.grams} g
                      </AppText>
                    }
                  />
                );
              })}
            </View>

            <View className="mt-4">
              <PillButton
                label="Buka katalog makan"
                variant="primary"
                icon="utensils"
                onPress={() => {
                  setIsDetailsModalOpen(false);
                  router.push("/(app)/(tabs)/meals");
                }}
              />
            </View>
          </Surface>
        </View>
      </Modal>
    </Surface>
  );
};
