import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  ViewProps,
  Pressable,
  useWindowDimensions,
  Modal,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import { AppText } from "./AppText";

// ==========================================
// Vector Icons for Crisp, Emoji-free Design
// ==========================================

const LeafBadgeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 13,
  color = "#059669",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DumbbellIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = "#059669",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 5v14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    <Path d="M3 8v8" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    <Path d="M6 12h12" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    <Path d="M18 5v14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    <Path d="M21 8v8" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

const WheatIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = "#d97706",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2v20" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <Path
      d="M12 5.5a3.5 3.5 0 0 1 4 3.5c0 1.8-3.5 3.5-4 3.5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
    <Path
      d="M12 5.5a3.5 3.5 0 0 0-4 3.5c0 1.8 3.5 3.5 4 3.5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
    <Path
      d="M12 11.5a3.5 3.5 0 0 1 4 3.5c0 1.8-3.5 3.5-4 3.5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
    <Path
      d="M12 11.5a3.5 3.5 0 0 0-4 3.5c0 1.8 3.5 3.5 4 3.5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </Svg>
);

const DropletIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = "#0284c7",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FlameIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 13,
  color = "#059669",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BarChartIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 14,
  color = "#2d523f",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 20V10" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    <Path d="M12 20V4" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    <Path d="M6 20v-6" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

const ChevronRightIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 14,
  color = "#64748b",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseModalIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = "#64748b",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

// ==========================================
// Fluid Animation Hook for Numbers & Progress
// ==========================================

function useAnimatedNumber(target: number, duration: number = 850, animTrigger: number = 0): number {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const startVal = startRef.current;
    const diff = target - startVal;
    if (diff === 0) {
      setDisplayValue(target);
      return;
    }

    const startTime = Date.now();
    let frameId: number;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Quintic ease-out curve for fluid, responsive motion
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startVal + diff * ease);

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        startRef.current = target;
        setDisplayValue(target);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration, animTrigger]);

  return displayValue;
}

// ==========================================
// Circular Ring with Animated Tip Dot
// ==========================================

interface MacroCircularRingProps {
  percentage: number; // 0 to 100
  color: string;
  trackColor: string;
  size?: number;
  strokeWidth?: number;
  animTrigger?: number;
}

const MacroCircularRing: React.FC<MacroCircularRingProps> = ({
  percentage,
  color,
  trackColor,
  size = 46,
  strokeWidth = 3.6,
  animTrigger = 0,
}) => {
  const animatedPercent = useAnimatedNumber(percentage, 950, animTrigger);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, animatedPercent));
  const progressRatio = clamped / 100;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Compute exact coordinate for indicator dot
  const center = size / 2;
  const angle = -Math.PI / 2 + progressRatio * 2 * Math.PI;
  const dotX = center + radius * Math.cos(angle);
  const dotY = center + radius * Math.sin(angle);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        {/* Background track circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated active progress arc */}
        {clamped > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
        {/* Glowing tip indicator dot (matches design in image 2) */}
        <Circle
          cx={dotX}
          cy={dotY}
          r={3}
          fill={color}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      </Svg>

      {/* Center Percentage Display */}
      <View pointerEvents="none" className="absolute items-center justify-center">
        <AppText
          weight="black"
          className="text-[11px] text-slate-800"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {animatedPercent}%
        </AppText>
      </View>
    </View>
  );
};

// ==========================================
// Animated Horizontal Progress Bar
// ==========================================

const AnimatedMacroBar: React.FC<{
  ratio: number; // 0 to 1
  color: string;
  trackBg: string;
  animTrigger?: number;
}> = ({ ratio, color, trackBg, animTrigger = 0 }) => {
  const animatedPct = useAnimatedNumber(Math.round(ratio * 100), 900, animTrigger);
  const clamped = Math.min(100, Math.max(0, animatedPct));

  return (
    <View
      style={{ backgroundColor: trackBg, height: 7, borderRadius: 4 }}
      className="w-full overflow-hidden my-2.5"
    >
      <View
        style={{
          width: `${clamped}%`,
          backgroundColor: color,
          height: "100%",
          borderRadius: 4,
        }}
      />
    </View>
  );
};

// ==========================================
// Main NutritionCard Component
// ==========================================

export interface NutritionCardProps extends ViewProps {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  totalCalories?: number;
  targetProteinGrams?: number;
  targetCarbsGrams?: number;
  targetFatGrams?: number;
  initialDemoMode?: boolean;
}

export const NutritionCard: React.FC<NutritionCardProps> = ({
  proteinGrams,
  carbsGrams,
  fatGrams,
  fiberGrams,
  totalCalories,
  targetProteinGrams = 134,
  targetCarbsGrams = 268,
  targetFatGrams = 60,
  initialDemoMode = true,
  className,
  style,
  ...props
}) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 375;

  // Realistic demonstration data aligned with image 2 targets
  const DEMO_TARGET_PROTEIN = targetProteinGrams > 0 ? targetProteinGrams : 134;
  const DEMO_TARGET_CARBS = targetCarbsGrams > 0 ? targetCarbsGrams : 268;
  const DEMO_TARGET_FAT = targetFatGrams > 0 ? targetFatGrams : 60;

  // Demonstration figures representing a healthy, active day (~66-70% achieved)
  const DEMO_CONSUMED_PROTEIN = 88; // 88 / 134g = ~66%
  const DEMO_CONSUMED_CARBS = 185;  // 185 / 268g = ~69%
  const DEMO_CONSUMED_FAT = 42;     // 42 / 60g = ~70%

  // Check if real data has any logs; if 0, default to demonstration mode
  const hasActualLogs = proteinGrams > 0 || carbsGrams > 0 || fatGrams > 0;
  const [isDemoMode, setIsDemoMode] = useState<boolean>(
    initialDemoMode ? true : !hasActualLogs
  );

  // Trigger state for re-running animations smoothly on demand
  const [animTrigger, setAnimTrigger] = useState<number>(0);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  const replayAnimation = () => {
    setAnimTrigger((prev) => prev + 1);
  };

  // Determine active values based on mode
  const activeProtein = isDemoMode ? DEMO_CONSUMED_PROTEIN : proteinGrams;
  const activeCarbs = isDemoMode ? DEMO_CONSUMED_CARBS : carbsGrams;
  const activeFat = isDemoMode ? DEMO_CONSUMED_FAT : fatGrams;

  const activeTargetProtein = isDemoMode ? DEMO_TARGET_PROTEIN : (targetProteinGrams || 134);
  const activeTargetCarbs = isDemoMode ? DEMO_TARGET_CARBS : (targetCarbsGrams || 268);
  const activeTargetFat = isDemoMode ? DEMO_TARGET_FAT : (targetFatGrams || 60);

  // Calculate ratios & percentages
  const proteinRatio = activeTargetProtein > 0 ? Math.min(1.0, activeProtein / activeTargetProtein) : 0;
  const carbsRatio = activeTargetCarbs > 0 ? Math.min(1.0, activeCarbs / activeTargetCarbs) : 0;
  const fatRatio = activeTargetFat > 0 ? Math.min(1.0, activeFat / activeTargetFat) : 0;

  const proteinPct = Math.round(proteinRatio * 100);
  const carbsPct = Math.round(carbsRatio * 100);
  const fatPct = Math.round(fatRatio * 100);

  // Animated values for display
  const animatedProteinVal = useAnimatedNumber(activeProtein, 850, animTrigger);
  const animatedCarbsVal = useAnimatedNumber(activeCarbs, 850, animTrigger);
  const animatedFatVal = useAnimatedNumber(activeFat, 850, animTrigger);

  const proteinCalories = Math.round(activeProtein * 4);
  const carbsCalories = Math.round(activeCarbs * 4);
  const fatCalories = Math.round(activeFat * 9);

  const animatedProteinKcal = useAnimatedNumber(proteinCalories, 850, animTrigger);
  const animatedCarbsKcal = useAnimatedNumber(carbsCalories, 850, animTrigger);
  const animatedFatKcal = useAnimatedNumber(fatCalories, 850, animTrigger);

  const totalCalculatedKcal = proteinCalories + carbsCalories + fatCalories;

  const macroCards = useMemo(
    () => [
      {
        id: "protein",
        title: "Protein",
        subtitle: "Build & repair muscles",
        consumed: animatedProteinVal,
        target: activeTargetProtein,
        ratio: proteinRatio,
        percent: proteinPct,
        calories: animatedProteinKcal,
        accentColor: "#059669",
        bgTint: "bg-[#f0fbf5]",
        borderTint: "border-[#d1f0dd]",
        iconBg: "bg-[#d7f3e4]",
        trackBg: "#dcf5e7",
        ringTrack: "#e2f5e9",
        icon: <DumbbellIcon size={20} color="#059669" />,
        footerIcon: <FlameIcon size={13} color="#059669" />,
      },
      {
        id: "carbs",
        title: "Carbs",
        subtitle: "Main source of energy",
        consumed: animatedCarbsVal,
        target: activeTargetCarbs,
        ratio: carbsRatio,
        percent: carbsPct,
        calories: animatedCarbsKcal,
        accentColor: "#d97706",
        bgTint: "bg-[#fffdf7]",
        borderTint: "border-[#faedd3]",
        iconBg: "bg-[#feecd2]",
        trackBg: "#fef3c7",
        ringTrack: "#feeed8",
        icon: <WheatIcon size={20} color="#d97706" />,
        footerIcon: <FlameIcon size={13} color="#d97706" />,
      },
      {
        id: "fat",
        title: "Fat",
        subtitle: "Supports hormone health",
        consumed: animatedFatVal,
        target: activeTargetFat,
        ratio: fatRatio,
        percent: fatPct,
        calories: animatedFatKcal,
        accentColor: "#0284c7",
        bgTint: "bg-[#f4f9fd]",
        borderTint: "border-[#d8ecfc]",
        iconBg: "bg-[#dbedfc]",
        trackBg: "#e0f2fe",
        ringTrack: "#e1f1fe",
        icon: <DropletIcon size={20} color="#0284c7" />,
        footerIcon: <DropletIcon size={13} color="#0284c7" />,
      },
    ],
    [
      animatedProteinVal,
      animatedCarbsVal,
      animatedFatVal,
      activeTargetProtein,
      activeTargetCarbs,
      activeTargetFat,
      proteinRatio,
      carbsRatio,
      fatRatio,
      proteinPct,
      carbsPct,
      fatPct,
      animatedProteinKcal,
      animatedCarbsKcal,
      animatedFatKcal,
    ]
  );

  return (
    <View
      className={`bg-white rounded-3xl border border-[#e5ebe7] p-4 sm:p-6 shadow-sm ${
        className || ""
      }`}
      style={style}
      {...props}
    >
      {/* ==================================================== */}
      {/* 1. Header Section: Badge, Title & Interactive Tools */}
      {/* ==================================================== */}
      <View className="flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3.5 border-b border-[#f0f4f1] gap-3">
        {/* Left: Green MACRONUTRIENTS Badge + Heading */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1.5">
            <View className="bg-[#ecf9f2] border border-[#d2f1e1] px-2.5 py-0.5 rounded-full flex-row items-center gap-1.5 self-start">
              <LeafBadgeIcon size={12} color="#059669" />
              <AppText
                weight="black"
                className="text-[10px] text-[#059669] tracking-wider uppercase"
              >
                Macronutrients
              </AppText>
            </View>

            {/* Interactive Demo Mode Toggle Pill */}
            <Pressable
              onPress={() => {
                setIsDemoMode((prev) => !prev);
                replayAnimation();
              }}
              className={`px-2.5 py-0.5 rounded-full flex-row items-center gap-1.5 border transition-all ${
                isDemoMode
                  ? "bg-amber-50 border-amber-300"
                  : "bg-slate-50 border-slate-200"
              }`}
              accessibilityRole="button"
              accessibilityLabel={`Toggle demonstration mode. Currently ${isDemoMode ? "Active" : "Inactive"}`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${
                  isDemoMode ? "bg-amber-500" : "bg-slate-400"
                }`}
              />
              <AppText
                weight="bold"
                className={`text-[10px] ${
                  isDemoMode ? "text-amber-800" : "text-slate-600"
                }`}
              >
                {isDemoMode ? "Demo Mode" : "Real Logs"}
              </AppText>
            </Pressable>

            {/* Replay Animation Button */}
            <Pressable
              onPress={replayAnimation}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 items-center justify-center active:scale-90"
              accessibilityRole="button"
              accessibilityLabel="Replay animations"
            >
              <AppText className="text-[11px] text-slate-600">↺</AppText>
            </Pressable>
          </View>

          <AppText weight="black" className="text-xl sm:text-2xl text-slate-900 tracking-tight">
            Macronutrient Balance
          </AppText>
          <AppText weight="medium" className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Protein, carbs & fats calibrated to your daily target
          </AppText>
        </View>

        {/* Right: "View Nutrition Details >" Action Button */}
        <Pressable
          onPress={() => setIsDetailsModalOpen(true)}
          className="bg-[#f2f7f4] hover:bg-[#e6f1eb] active:scale-95 border border-[#dae8e0] px-3.5 py-2 rounded-xl flex-row items-center gap-2 self-start sm:self-auto transition-transform"
          accessibilityRole="button"
          accessibilityLabel="View comprehensive nutrition details"
        >
          <BarChartIcon size={14} color="#1b4d3e" />
          <AppText weight="extrabold" className="text-xs text-[#1b4d3e]">
            View Nutrition Details
          </AppText>
          <ChevronRightIcon size={13} color="#1b4d3e" />
        </Pressable>
      </View>

      {/* ==================================================== */}
      {/* 2. Three Macro Cards (Protein, Carbs, Fat) */}
      {/* ==================================================== */}
      <View className={isNarrow ? "flex-col gap-3" : "flex-row gap-3 sm:gap-4"}>
        {macroCards.map((card) => (
          <Pressable
            key={card.id}
            onPress={replayAnimation}
            className={`flex-1 ${card.bgTint} ${card.borderTint} border rounded-2xl p-3.5 sm:p-4 justify-between transition-all active:scale-[0.99]`}
          >
            {/* Top Row: Icon + Label & Radial Circular Ring */}
            <View className="flex-row items-start justify-between mb-2">
              {/* Left: Icon Squircle + Name + Subtitle */}
              <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                <View
                  className={`w-9 h-9 sm:w-10 sm:h-10 ${card.iconBg} rounded-xl items-center justify-center flex-shrink-0`}
                >
                  {card.icon}
                </View>
                <View className="flex-1">
                  <AppText
                    weight="extrabold"
                    numberOfLines={1}
                    className="text-sm sm:text-base text-slate-800 leading-tight"
                  >
                    {card.title}
                  </AppText>
                  <AppText
                    weight="medium"
                    numberOfLines={1}
                    className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight"
                  >
                    {card.subtitle}
                  </AppText>
                </View>
              </View>

              {/* Right: Circular SVG Mini Ring with Glowing Tip Dot */}
              <View className="flex-shrink-0">
                <MacroCircularRing
                  percentage={card.percent}
                  color={card.accentColor}
                  trackColor={card.ringTrack}
                  animTrigger={animTrigger}
                />
              </View>
            </View>

            {/* Middle Row: Large Consumed / Target Numbers */}
            <View className="my-1.5">
              <View className="flex-row items-baseline">
                <AppText
                  weight="black"
                  className="text-2xl sm:text-3xl text-slate-900 tracking-tight leading-none"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {card.consumed}
                </AppText>
                <AppText
                  weight="bold"
                  className="text-xs sm:text-sm text-slate-400 ml-1.5"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  / {card.target}g
                </AppText>
              </View>
            </View>

            {/* Horizontal Animated Progress Bar */}
            <AnimatedMacroBar
              ratio={card.ratio}
              color={card.accentColor}
              trackBg={card.trackBg}
              animTrigger={animTrigger}
            />

            {/* Bottom Row: Calories & Calibrated Target */}
            <View className="flex-row items-center justify-between pt-1">
              <View className="flex-row items-center gap-1.5">
                {card.footerIcon}
                <AppText
                  weight="bold"
                  className="text-[11px] sm:text-xs text-slate-600"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {card.calories} kcal
                </AppText>
              </View>

              <AppText
                weight="bold"
                className="text-[11px] sm:text-xs text-slate-400"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                Target {card.target}g
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>

      {/* ==================================================== */}
      {/* 3. Nutrition Details Breakdown Modal */}
      {/* ==================================================== */}
      <Modal
        visible={isDetailsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDetailsModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-neutral-100">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-neutral-100">
              <View>
                <View className="flex-row items-center gap-2">
                  <LeafBadgeIcon size={14} color="#059669" />
                  <AppText weight="black" className="text-lg text-slate-900">
                    Nutrition Breakdown
                  </AppText>
                </View>
                <AppText weight="medium" className="text-xs text-slate-500 mt-0.5">
                  {isDemoMode ? "Demonstration Target Plan" : "Current Daily Progress"}
                </AppText>
              </View>
              <Pressable
                onPress={() => setIsDetailsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:scale-95"
              >
                <CloseModalIcon size={18} color="#475569" />
              </Pressable>
            </View>

            {/* Summary Statistics */}
            <View className="my-4 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/50 flex-row items-center justify-between">
              <View>
                <AppText weight="bold" className="text-xs text-emerald-800">
                  Total Energy Calibrated
                </AppText>
                <AppText weight="black" className="text-2xl text-emerald-950 mt-0.5">
                  {totalCalories || totalCalculatedKcal} kcal
                </AppText>
              </View>
              {fiberGrams !== undefined && (
                <View className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                  <AppText weight="bold" className="text-[11px] text-emerald-800">
                    Dietary Fiber: {fiberGrams || 18}g
                  </AppText>
                </View>
              )}
            </View>

            {/* Macro Ratio Rows */}
            <View className="gap-3">
              <View className="p-3 bg-[#f0fbf5] rounded-xl border border-[#d1f0dd] flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <DumbbellIcon size={16} color="#059669" />
                  <View>
                    <AppText weight="bold" className="text-xs text-slate-800">
                      Protein ({Math.round(((activeProtein * 4) / (totalCalculatedKcal || 1)) * 100)}%)
                    </AppText>
                    <AppText weight="medium" className="text-[11px] text-slate-500">
                      {activeProtein}g of {activeTargetProtein}g ({proteinPct}% goal)
                    </AppText>
                  </View>
                </View>
                <AppText weight="extrabold" className="text-xs text-emerald-700">
                  {activeProtein * 4} kcal
                </AppText>
              </View>

              <View className="p-3 bg-[#fffdf7] rounded-xl border border-[#faedd3] flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <WheatIcon size={16} color="#d97706" />
                  <View>
                    <AppText weight="bold" className="text-xs text-slate-800">
                      Carbohydrates ({Math.round(((activeCarbs * 4) / (totalCalculatedKcal || 1)) * 100)}%)
                    </AppText>
                    <AppText weight="medium" className="text-[11px] text-slate-500">
                      {activeCarbs}g of {activeTargetCarbs}g ({carbsPct}% goal)
                    </AppText>
                  </View>
                </View>
                <AppText weight="extrabold" className="text-xs text-amber-700">
                  {activeCarbs * 4} kcal
                </AppText>
              </View>

              <View className="p-3 bg-[#f4f9fd] rounded-xl border border-[#d8ecfc] flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <DropletIcon size={16} color="#0284c7" />
                  <View>
                    <AppText weight="bold" className="text-xs text-slate-800">
                      Healthy Fats ({Math.round(((activeFat * 9) / (totalCalculatedKcal || 1)) * 100)}%)
                    </AppText>
                    <AppText weight="medium" className="text-[11px] text-slate-500">
                      {activeFat}g of {activeTargetFat}g ({fatPct}% goal)
                    </AppText>
                  </View>
                </View>
                <AppText weight="extrabold" className="text-xs text-sky-700">
                  {activeFat * 9} kcal
                </AppText>
              </View>
            </View>

            {/* Navigation Button to Meal Log */}
            <Pressable
              onPress={() => {
                setIsDetailsModalOpen(false);
                router.push("/meals");
              }}
              className="mt-5 bg-emerald-600 hover:bg-emerald-700 py-3 rounded-2xl items-center justify-center active:scale-95"
            >
              <AppText weight="black" className="text-sm text-white">
                Go to Meal Journal →
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};
