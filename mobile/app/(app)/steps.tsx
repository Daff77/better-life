import React, { useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Button, Input, ProgressBar } from "@/components/ui";
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
    if (!/^\d+$/.test(input.trim()) || !Number.isSafeInteger(Number(input))) {
      setValidation("Isi total langkah dengan angka bulat, misalnya 4350.");
      return;
    }
    setValidation(null);
    try {
      const updated = await mutation.mutateAsync(Number(input));
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

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          gap: 24,
          maxWidth: 560,
          width: "100%",
          alignSelf: "center",
          paddingBottom: 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Button
          title="Kembali"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: "flex-start" }}
        />
        <View style={{ gap: 8 }}>
          <AppText
            weight="bold"
            className="text-[28px] text-ink"
            accessibilityRole="header"
          >
            Langkah hari ini
          </AppText>
          <AppText className="text-muted">
            Perbanyak langkah, sedikit demi sedikit.
          </AppText>
        </View>
        <View
          className="bg-card border border-line rounded-[20px] p-5"
          style={{ gap: 12 }}
        >
          <AppText weight="bold" className="text-[36px] text-ink">
            {activity.isPending ? "Memuat…" : steps.toLocaleString("id-ID")}
          </AppText>
          <AppText className="text-muted">
            Target {goal.toLocaleString("id-ID")} langkah per hari
          </AppText>
          <ProgressBar progress={Math.min(100, (steps / goal) * 100)} />
          {activity.isError && (
            <>
              <AppText accessibilityRole="alert">Data belum bisa dimuat.</AppText>
              <Button
                title="Muat ulang"
                variant="outline"
                onPress={() => void activity.refetch()}
              />
            </>
          )}
        </View>
        <View style={{ gap: 12 }}>
          <AppText weight="semibold" className="text-[18px] text-ink">
            {status === "tracking" ? "Pelacakan aktif" : "Pelacakan otomatis"}
          </AppText>
          <AppText className="text-muted" accessibilityLiveRegion="polite">
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
          {settingsError && <AppText accessibilityRole="alert">{settingsError}</AppText>}
          {status === "tracking" && (
            <Button title="Hentikan pelacakan" variant="ghost" onPress={stopTracking} />
          )}
          <AppText className="text-[12px] text-muted">
            Data langkah disimpan di perangkat ini untuk akun Anda, per hari. Better Life
            hanya membaca langkah; tidak menulis data ke Health Connect.
          </AppText>
        </View>
        <ManualStepsForm
          key={`${account}-${date}`}
          disabled={activity.isPending || activity.isError}
        />
      </ScrollView>
    </ScreenWrapper>
  );
}
