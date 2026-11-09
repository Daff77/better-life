import React from "react";
import { View, Image, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { AppText, Button, FadeInView, FlowScreen, LineIcon, LineIconName } from "@/components/ui";
import { BrandImages, MealIllustrations } from "@/constants/Assets";

/*
 * Welcome. One idea per band: brand, a picture of a whole day of eating,
 * the promise in one line, three concrete facts, then two clear doors.
 */

const MOSAIC = [
  MealIllustrations.Breakfast,
  MealIllustrations.Lunch,
  MealIllustrations.Dinner,
  MealIllustrations.Snacks,
];

const FACTS: Array<{ icon: LineIconName; text: string }> = [
  { icon: "target", text: "Target kalori dihitung dari data tubuh Anda" },
  { icon: "utensils", text: "Catat makan harian dalam beberapa ketukan" },
  { icon: "wallet", text: "Resep dan rencana menu sesuai budget lokal" },
];

export default function GetStartedScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const tile = compact ? 92 : 118;

  return (
    <FlowScreen
      footer={
        <View className="gap-2.5">
          <Button
            title="Mulai sekarang"
            size="lg"
            onPress={() => router.push("/(auth)/signup")}
            accessibilityLabel="Buat akun baru"
          />
          <Button
            title="Saya sudah punya akun"
            size="lg"
            variant="social"
            onPress={() => router.push("/(auth)/login")}
            accessibilityLabel="Masuk ke akun"
          />
        </View>
      }
    >
      <FadeInView index={0}>
        <View className="flex-row items-center justify-between mb-5">
          <Image
            source={BrandImages.logoPng}
            style={{ width: 52, height: 52, marginLeft: -6 }}
            resizeMode="contain"
            accessibilityLabel="Better Life"
          />
          <AppText weight="semibold" className="text-[13px] text-muted">
            Nutrisi harian
          </AppText>
        </View>
      </FadeInView>

      <FadeInView index={1}>
        <View className="flex-row flex-wrap gap-1.5 rounded-[24px] overflow-hidden" accessibilityElementsHidden>
          {MOSAIC.map((src, i) => (
            <View key={i} style={{ width: "49%", flexGrow: 1, height: tile }} className="bg-card-2">
              <Image source={src} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </View>
          ))}
        </View>
      </FadeInView>

      <FadeInView index={2}>
        <AppText
          weight="semibold"
          className="text-ink mt-7"
          style={{ fontSize: compact ? 28 : 32, lineHeight: compact ? 33 : 37, letterSpacing: -0.9 }}
          accessibilityRole="header"
        >
          Makan lebih baik, satu hari dalam satu waktu.
        </AppText>
        <AppText weight="medium" className="text-[15px] text-muted mt-2.5" style={{ lineHeight: 21 }}>
          Better Life menyusun target, mencatat asupan, dan menyarankan menu yang cocok untuk Anda.
        </AppText>
      </FadeInView>

      <FadeInView index={3}>
        <View className="mt-6">
          {FACTS.map((f, i) => (
            <View
              key={f.icon}
              className={`flex-row items-center gap-3.5 py-3 ${i < FACTS.length - 1 ? "border-b border-line" : ""}`}
            >
              <View className="w-9 h-9 rounded-full bg-primary-light items-center justify-center">
                <LineIcon name={f.icon} size={18} color="#0b6b47" />
              </View>
              <AppText weight="semibold" className="text-[14.5px] text-ink flex-1">
                {f.text}
              </AppText>
            </View>
          ))}
        </View>
      </FadeInView>
    </FlowScreen>
  );
}
