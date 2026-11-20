import React, { useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AnimatedNumber, AppText, Button, Header, Input, ProgressBar, Surface } from "@/components/ui";
import {
  useActivityIdentity,
  useActivityStats,
  useSetStepsMutation,
} from "@/hooks/useActivityQuery";
import { TrackingStatus, useStepTrackerStore } from "@/stores/useStepTrackerStore";

function trackingDescription(
  status: TrackingStatus,
  historyAvailable: boolean,
  error: string | null
) {
  if (Platform.OS === "web")
    return "Sensor langkah tersedia di aplikasi Android dan iOS. Di sini, Anda bisa mengisi total langkah secara manual.";
  if (status === "tracking") {
    if (historyAvailable)
      return "Sensor aktif. Riwayat langkah hari ini disinkronkan saat aplikasi dibuka kembali. Di Android, riwayat bergantung pada aplikasi kesehatan yang menyimpan langkah ke Health Connect dan dapat tertunda.";
    return "Sensor aktif selama aplikasi terbuka. Langkah saat aplikasi ditutup belum tersedia dari riwayat kesehatan HP.";
  }
  if (status === "build-required")
    return "Pelacakan Android memerlukan build Better Life sendiri. Sensor langkah tidak tersedia di Expo Go Android.";
  if (status === "unavailable")
    return "Sensor langkah tidak tersedia di perangkat ini. Anda tetap bisa mencatat total harian.";
  if (status === "denied" || status === "blocked")
    return "Izin aktivitas fisik belum diberikan. Izinkan akses untuk membaca langkah dari HP.";
  return (
    error ??
    "Aktifkan akses aktivitas fisik untuk menghitung langkah otomatis. Bawa HP saat berjalan."
  );
}

function ManualStepsForm({ disabled }: { disabled: boolean }) {
  const mutation = useSetStepsMutation();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  const save = async () => {
    setMessage(null);
    const trimmed = input.trim();
    const numeric = Number(trimmed);
    if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(numeric) || numeric > 200000) {
      setValidation("Isi total langkah dengan angka bulat antara 0 hingga 200.000.");
      return;
    }
    setValidation(null);
    try {
      const updated = await mutation.mutateAsync(numeric);
      setMessage(
        `Tersimpan. Total hari ini ${updated.steps.toLocaleString("id-ID")} langkah.`
      );
    } catch {
      setValidation("Langkah belum tersimpan. Coba simpan lagi.");
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <AppText weight="semibold" className="text-[18px] text-ink">
        Catat total manual
      </AppText>
      <AppText className="text-muted">
        Masukkan total dari HP atau jam Anda. Total manual dan sensor tidak dijumlahkan;
        angka terbesar digunakan agar langkah tidak terhitung dua kali.
      </AppText>
      <Input
        label="Total langkah hari ini"
        accessibilityLabel="Total langkah hari ini"
        placeholder="Contoh: 4350"
        keyboardType="number-pad"
        value={input}
        onChangeText={(value) => {
          setInput(value);
          setValidation(null);
          setMessage(null);
        }}
        error={validation ?? undefined}
        editable={!mutation.isPending}
        onSubmitEditing={() => void save()}
      />
      <Button
        title="Simpan total langkah"
        variant="outline"
        loading={mutation.isPending}
        disabled={disabled}
        onPress={() => void save()}
      />
      {message && (
        <AppText accessibilityLiveRegion="polite" className="text-primary">
          {message}
        </AppText>
      )}
    </View>
  );
}

export default function StepsScreen() {
  const router = useRouter();
  const activity = useActivityStats();
  const { account, date } = useActivityIdentity();
  const { status, historyAvailable, error, requestTracking, stopTracking } =
    useStepTrackerStore();
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const steps = activity.data?.steps ?? 0;
  const goal = activity.data?.stepGoal ?? 6000;
  const busy = status === "checking";
  const unsupported =
    status === "unavailable" || status === "build-required" || Platform.OS === "web";
  const description = trackingDescription(status, historyAvailable, error);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(tabs)");
    }
  };

  return (
    <ScreenWrapper maxWidth="narrow" className="flex-1 bg-canvas">
      <Header
        onBack={handleBack}
        title="Langkah hari ini"
        subtitle="Perbanyak langkah, sedikit demi sedikit"
      />
      <ScrollView
        contentContainerStyle={{
          paddingVertical: 12,
          gap: 20,
          width: "100%",
          paddingBottom: 64,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={{ gap: 12 }}>
          {activity.isPending ? (
            <AppText
              weight="bold"
              className="text-[36px] text-ink"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              Memuat…
            </AppText>
          ) : (
            <AnimatedNumber
              value={steps}
              formatter={(v) => Math.round(v).toLocaleString("id-ID")}
              duration={420}
              weight="bold"
              className="text-[36px] text-ink"
              style={{ fontVariant: ["tabular-nums"] }}
            />
          )}
          <AppText className="text-muted" style={{ fontVariant: ["tabular-nums"] }}>
            Target {goal.toLocaleString("id-ID")} langkah per hari
          </AppText>
          <ProgressBar progress={Math.min(100, (steps / Math.max(1, goal)) * 100)} />
          {activity.isError && (
            <>
              <AppText accessibilityRole="alert" className="text-bad text-sm">
                Data belum bisa dimuat.
              </AppText>
              <Button
                title="Muat ulang"
                variant="outline"
                onPress={() => void activity.refetch()}
              />
            </>
          )}
        </Surface>
        <Surface style={{ gap: 12 }}>
          <AppText weight="semibold" className="text-[18px] text-ink">
            {status === "tracking" ? "Pelacakan aktif" : "Pelacakan otomatis"}
          </AppText>
          <AppText className="text-muted leading-5" accessibilityLiveRegion="polite">
            {busy ? "Memeriksa izin dan sensor…" : description}
          </AppText>
          {!unsupported && (
            <Button
              title={
                status === "blocked"
                  ? "Buka pengaturan izin"
                  : status === "tracking"
                    ? "Sinkronkan langkah"
                    : "Aktifkan pelacakan langkah"
              }
              loading={busy}
              onPress={() => {
                setSettingsError(null);
                if (status === "blocked")
                  void Linking.openSettings().catch(() =>
                    setSettingsError(
                      "Pengaturan tidak bisa dibuka. Buka izin Better Life dari pengaturan HP."
                    )
                  );
                else requestTracking();
              }}
            />
          )}
          {settingsError && (
            <AppText accessibilityRole="alert" className="text-bad text-sm">
              {settingsError}
            </AppText>
          )}
          {status === "tracking" && (
            <Button title="Hentikan pelacakan" variant="ghost" onPress={stopTracking} />
          )}
          <AppText className="text-[12px] text-muted leading-4">
            Data langkah disimpan di perangkat ini untuk akun Anda, per hari. Better Life
            hanya membaca langkah; tidak menulis data ke Health Connect.
          </AppText>
        </Surface>
        <Surface>
          <ManualStepsForm
            key={`${account}-${date}`}
            disabled={activity.isPending || activity.isError}
          />
        </Surface>
      </ScrollView>
    </ScreenWrapper>
  );
}
