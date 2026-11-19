import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  Platform,
  Linking,
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
  ColorBlock,
  ListRow,
  RowIcon,
  PillButton,
  RingButton,
  LineIcon,
  SURFACE_SHADOW,
} from "@/components/ui";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import {
  PlanId,
  SUBSCRIPTION_PLANS,
  getStatusDisplayLabel,
} from "@/lib/subscriptionDomain";

export default function UpgradeScreen() {
  const router = useRouter();

  const {
    status,
    isPremium,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    paymentReadiness,
    pendingSessionId,
    isLoading,
    isUpgrading,
    fetchStatus,
    upgradePlan,
    verifyCheckoutSession,
    cancelSubscription,
    restorePurchases,
  } = useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>("annual");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const statusInfo = getStatusDisplayLabel(status, cancelAtPeriodEnd);

  const handleUpgrade = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!paymentReadiness.canCheckout) {
      setErrorMessage(
        "Gateway pembayaran terverifikasi belum dikonfigurasi pada server. Aktivasi tanpa verifikasi pembayaran dinonaktifkan demi keamanan akun."
      );
      return;
    }

    const provider = paymentReadiness.stripeConfigured ? "stripe" : "mock_sandbox";
    const result = await upgradePlan(selectedPlan, provider);

    if (!result.success) {
      setErrorMessage(
        result.error || "Tidak dapat memulai proses pembayaran. Silakan coba lagi."
      );
      return;
    }

    if (result.checkoutUrl) {
      setSuccessMessage(
        "Sesi pembayaran Stripe telah dibuat. Selesaikan pembayaran pada halaman Stripe lalu ketuk Verifikasi Pembayaran."
      );
      try {
        await Linking.openURL(result.checkoutUrl);
      } catch {
        // User can still copy or inspect status
      }
      return;
    }

    if (result.sandboxMode) {
      setSuccessMessage(
        `Mode Sandbox Pengujian aktif: paket ${SUBSCRIPTION_PLANS[selectedPlan].name} diaktifkan khusus untuk pengujian lokal (bukan transaksi uang nyata).`
      );
      return;
    }

    setSuccessMessage(result.message || "Permintaan langganan dicatat dan menunggu verifikasi.");
  };

  const handleVerifyPending = async () => {
    if (!pendingSessionId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    const res = await verifyCheckoutSession(pendingSessionId, selectedPlan);
    if (res.success) {
      setSuccessMessage(res.message || "Pembayaran berhasil diverifikasi dan akses Premium aktif.");
    } else {
      setErrorMessage(res.error || "Pembayaran belum selesai atau belum terverifikasi.");
    }
  };

  const handleCancelAutoRenew = async () => {
    setCancelModalVisible(false);
    setErrorMessage(null);
    const result = await cancelSubscription("User requested cancellation via settings");
    if (result.success) {
      setSuccessMessage(
        "Perpanjangan otomatis telah dibatalkan. Akses Premium Anda tetap aktif hingga akhir periode berjalan."
      );
    } else {
      setErrorMessage(result.error || "Tidak dapat membatalkan langganan.");
    }
  };

  const handleRestore = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const result = await restorePurchases();
    if (result.restored) {
      setSuccessMessage(result.message);
    } else {
      if (Platform.OS === "web") {
        setErrorMessage(result.message);
      } else {
        Alert.alert("Pulihkan Pembelian", result.message);
      }
    }
  };

  const COMPARISON_ROWS = [
    {
      feature: "Pencatatan makanan & kalori harian",
      free: "Termasuk",
      premium: "Termasuk",
    },
    {
      feature: "Pemantauan target makronutrisi",
      free: "Dasar",
      premium: "Lengkap + Serat",
    },
    {
      feature: "Katalog resep sehat kurasi",
      free: "Resep standar",
      premium: "Penuh + Koleksi Chef",
    },
    {
      feature: "Analitik tren 7 & 30 hari serta skor kepatuhan",
      free: false,
      premium: true,
    },
    {
      feature: "Perencana menu 7 hari otomatis & daftar belanja",
      free: false,
      premium: true,
    },
    {
      feature: "Rekomendasi menu sesuai anggaran pasar lokal",
      free: false,
      premium: true,
    },
    {
      feature: "Ekspor laporan nutrisi lengkap (CSV/JSON)",
      free: false,
      premium: true,
    },
  ];

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#edf1ee]">
      <Header
        onBack={() => router.back()}
        title="Better Life Premium"
        subtitle="Perangkat nutrisi terkalibrasi untuk kebiasaan sehat berkelanjutan"
        rightComponent={
          <PillButton
            label="Pulihkan"
            size="sm"
            variant="ghost"
            onPress={handleRestore}
            disabled={isLoading || isUpgrading}
            accessibilityLabel="Pulihkan pembelian"
          />
        }
      />

      <ScrollView
        className="flex-1 pt-1"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 64 : 112 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="max-w-3xl mx-auto w-full gap-4">
          {/* Current Membership Status Card */}
          <FadeInView index={0}>
            <Surface>
              <View className="flex-row items-center justify-between flex-wrap gap-3">
                <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
                  <RowIcon tone={isPremium ? "amber" : "green"}>
                    <LineIcon
                      name="crown"
                      size={18}
                      color={isPremium ? "#946000" : "#0e7a52"}
                    />
                  </RowIcon>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <AppText weight="semibold" className="text-[15px] text-[#121a16]">
                        Status Keanggotaan
                      </AppText>
                      <StatusPill
                        tone={
                          statusInfo.badgeVariant === "success"
                            ? "ok"
                            : statusInfo.badgeVariant === "warning"
                            ? "warn"
                            : "neutral"
                        }
                        label={statusInfo.label}
                      />
                    </View>
                    <AppText weight="regular" className="text-xs text-[#56605a] mt-0.5">
                      {statusInfo.description}
                    </AppText>
                  </View>
                </View>

                {currentPeriodEnd && (
                  <View className="items-end">
                    <AppText weight="medium" className="text-[11px] text-[#56605a]">
                      {cancelAtPeriodEnd ? "Akses berakhir" : "Perpanjangan berikutnya"}
                    </AppText>
                    <AppText
                      weight="semibold"
                      className="text-xs text-[#121a16] mt-0.5"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {new Date(currentPeriodEnd).toLocaleDateString("id-ID", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </AppText>
                  </View>
                )}
              </View>

              {isPremium && !cancelAtPeriodEnd && (
                <View className="mt-3.5 pt-3.5 border-t border-[#e6eae7] flex-row items-center justify-between flex-wrap gap-2">
                  <AppText weight="regular" className="text-xs text-[#56605a] flex-1">
                    Perpanjangan otomatis aktif. Anda dapat membatalkan kapan saja tanpa kehilangan sisa hari berbayar.
                  </AppText>
                  <PillButton
                    label="Kelola Langganan"
                    size="sm"
                    variant="soft"
                    onPress={() => setCancelModalVisible(true)}
                    accessibilityLabel="Batalkan perpanjangan otomatis"
                  />
                </View>
              )}
            </Surface>
          </FadeInView>

          {/* Payment Gateway Readiness Banner */}
          {!paymentReadiness.stripeConfigured && (
            <FadeInView duration={220} translateY={4}>
              <Surface className="py-3.5 px-4 bg-[#fdf8ea] border-[#efe0b9]">
                <View className="flex-row items-start gap-3">
                  <RowIcon tone="amber" icon="shield" />
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <AppText weight="semibold" className="text-[13.5px] text-[#1b1406]">
                        {paymentReadiness.sandboxEnabled
                          ? "Mode Sandbox Pengujian Lokal Aktif"
                          : "Gateway Pembayaran Belum Dikonfigurasi"}
                      </AppText>
                      <StatusPill
                        tone="warn"
                        label={paymentReadiness.sandboxEnabled ? "Sandbox" : "Menunggu Konfigurasi"}
                        dot={false}
                      />
                    </View>
                    <AppText weight="regular" className="text-xs text-[#56605a] mt-1 leading-relaxed">
                      {paymentReadiness.sandboxEnabled
                        ? "Kredensial Stripe nyata belum dipasang. Tombol aktivasi di bawah hanya menjalankan pengujian lokal (ENABLE_PAYMENT_SANDBOX=true) tanpa menagih pembayaran nyata."
                        : `Aktivasi Premium tanpa verifikasi ditolak oleh server. Konfigurasikan variabel lingkungan berikut pada backend untuk mengaktifkan Stripe Checkout terverifikasi: ${paymentReadiness.missingRequirements.join(", ")}.`}
                    </AppText>
                  </View>
                </View>
              </Surface>
            </FadeInView>
          )}

          {/* Feedback Banners */}
          {successMessage && (
            <FadeInView duration={220} translateY={4}>
              <Surface className="py-3.5 px-4 bg-[#e2f2ec] border-[#bfe0d2]">
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-row items-center gap-2 flex-1">
                    <LineIcon name="check" size={16} color="#0e7a52" />
                    <AppText weight="semibold" className="text-xs text-[#0e7a52] flex-1">
                      {successMessage}
                    </AppText>
                  </View>
                  <RingButton onPress={() => setSuccessMessage(null)} accessibilityLabel="Tutup pesan">
                    <LineIcon name="close" size={14} color="#0e7a52" />
                  </RingButton>
                </View>
              </Surface>
            </FadeInView>
          )}

          {errorMessage && (
            <FadeInView duration={220} translateY={4}>
              <Surface className="py-3.5 px-4 bg-[#fde9e7] border-[#f5c2be]">
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-row items-center gap-2 flex-1">
                    <LineIcon name="alert" size={16} color="#b92d26" />
                    <AppText weight="semibold" className="text-xs text-[#b92d26] flex-1">
                      {errorMessage}
                    </AppText>
                  </View>
                  <RingButton onPress={() => setErrorMessage(null)} accessibilityLabel="Tutup pesan">
                    <LineIcon name="close" size={14} color="#b92d26" />
                  </RingButton>
                </View>
              </Surface>
            </FadeInView>
          )}

          {/* Pending Stripe Verification Card */}
          {pendingSessionId && !isPremium && (
            <Surface className="py-3.5 px-4">
              <View className="flex-row items-center justify-between flex-wrap gap-3">
                <View className="flex-1 min-w-[200px]">
                  <AppText weight="semibold" className="text-[13.5px] text-ink">
                    Menunggu konfirmasi pembayaran Stripe
                  </AppText>
                  <AppText weight="regular" className="text-xs text-muted mt-0.5">
                    Setelah menyelesaikan pembayaran di jendela checkout, ketuk tombol verifikasi untuk menyinkronkan status akun.
                  </AppText>
                </View>
                <PillButton
                  label={isUpgrading ? "Memverifikasi..." : "Verifikasi Pembayaran"}
                  variant="primary"
                  size="sm"
                  onPress={handleVerifyPending}
                  disabled={isUpgrading}
                />
              </View>
            </Surface>
          )}

          {/* Plan Selector Cards */}
          <FadeInView index={1}>
            <View className="flex-col sm:flex-row gap-3.5">
              {/* Annual Plan */}
              <View className="flex-1">
                <ColorBlock
                  tone={selectedPlan === "annual" ? "green" : "mist"}
                  onPress={() => setSelectedPlan("annual")}
                  accessibilityLabel="Pilih paket tahunan"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <AppText
                      weight="semibold"
                      className={`text-xs uppercase tracking-wider ${
                        selectedPlan === "annual" ? "text-white/80" : "text-[#56605a]"
                      }`}
                    >
                      Tahunan · Hemat 32%
                    </AppText>
                    <View
                      className={`w-5 h-5 rounded-full items-center justify-center ${
                        selectedPlan === "annual"
                          ? "bg-white"
                          : "border border-[#56605a]"
                      }`}
                    >
                      {selectedPlan === "annual" && (
                        <LineIcon name="check" size={12} color="#0e7a52" />
                      )}
                    </View>
                  </View>

                  <AppText
                    weight="semibold"
                    className={`text-3xl ${
                      selectedPlan === "annual" ? "text-white" : "text-[#121a16]"
                    }`}
                    style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.9 }}
                  >
                    Rp 399.000
                    <AppText
                      weight="regular"
                      className={`text-xs ${
                        selectedPlan === "annual" ? "text-white/75" : "text-[#56605a]"
                      }`}
                    >
                      {" "}/ tahun
                    </AppText>
                  </AppText>

                  <AppText
                    weight="regular"
                    className={`text-xs mt-1 ${
                      selectedPlan === "annual" ? "text-white/85" : "text-[#56605a]"
                    }`}
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    Setara Rp 33.250 / bulan · Ditagih sekali setahun
                  </AppText>

                  <View
                    className={`mt-4 pt-3 border-t gap-1.5 ${
                      selectedPlan === "annual" ? "border-white/20" : "border-[#121a16]/10"
                    }`}
                  >
                    <AppText
                      weight="medium"
                      className={`text-xs ${
                        selectedPlan === "annual" ? "text-white" : "text-[#121a16]"
                      }`}
                    >
                      • Akses penuh seluruh fitur Premium & Koleksi Chef
                    </AppText>
                    <AppText
                      weight="medium"
                      className={`text-xs ${
                        selectedPlan === "annual" ? "text-white" : "text-[#121a16]"
                      }`}
                    >
                      • Nilai terbaik untuk konsistensi nutrisi jangka panjang
                    </AppText>
                  </View>
                </ColorBlock>
              </View>

              {/* Monthly Plan */}
              <View className="flex-1">
                <ColorBlock
                  tone={selectedPlan === "monthly" ? "green" : "mist"}
                  onPress={() => setSelectedPlan("monthly")}
                  accessibilityLabel="Pilih paket bulanan"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <AppText
                      weight="semibold"
                      className={`text-xs uppercase tracking-wider ${
                        selectedPlan === "monthly" ? "text-white/80" : "text-[#56605a]"
                      }`}
                    >
                      Bulanan · Fleksibel
                    </AppText>
                    <View
                      className={`w-5 h-5 rounded-full items-center justify-center ${
                        selectedPlan === "monthly"
                          ? "bg-white"
                          : "border border-[#56605a]"
                      }`}
                    >
                      {selectedPlan === "monthly" && (
                        <LineIcon name="check" size={12} color="#0e7a52" />
                      )}
                    </View>
                  </View>

                  <AppText
                    weight="semibold"
                    className={`text-3xl ${
                      selectedPlan === "monthly" ? "text-white" : "text-[#121a16]"
                    }`}
                    style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.9 }}
                  >
                    Rp 49.000
                    <AppText
                      weight="regular"
                      className={`text-xs ${
                        selectedPlan === "monthly" ? "text-white/75" : "text-[#56605a]"
                      }`}
                    >
                      {" "}/ bulan
                    </AppText>
                  </AppText>

                  <AppText
                    weight="regular"
                    className={`text-xs mt-1 ${
                      selectedPlan === "monthly" ? "text-white/85" : "text-[#56605a]"
                    }`}
                  >
                    Fleksibilitas bulanan · Batalkan kapan saja
                  </AppText>

                  <View
                    className={`mt-4 pt-3 border-t gap-1.5 ${
                      selectedPlan === "monthly" ? "border-white/20" : "border-[#121a16]/10"
                    }`}
                  >
                    <AppText
                      weight="medium"
                      className={`text-xs ${
                        selectedPlan === "monthly" ? "text-white" : "text-[#121a16]"
                      }`}
                    >
                      • Akses penuh seluruh fitur Premium & Koleksi Chef
                    </AppText>
                    <AppText
                      weight="medium"
                      className={`text-xs ${
                        selectedPlan === "monthly" ? "text-white" : "text-[#121a16]"
                      }`}
                    >
                      • Tanpa komitmen tahunan di awal
                    </AppText>
                  </View>
                </ColorBlock>
              </View>
            </View>
          </FadeInView>

          {/* Primary Action Button */}
          <FadeInView index={2}>
            <Surface className="py-4 px-5 flex-col sm:flex-row sm:items-center justify-between gap-3">
              <View className="flex-1">
                <AppText weight="semibold" className="text-sm text-[#121a16]">
                  {SUBSCRIPTION_PLANS[selectedPlan].name}
                </AppText>
                <AppText weight="regular" className="text-xs text-[#56605a] mt-0.5">
                  {paymentReadiness.stripeConfigured
                    ? "Pembayaran diproses melalui Stripe Checkout dan diverifikasi otomatis oleh server."
                    : paymentReadiness.sandboxEnabled
                    ? "Mode Sandbox Pengujian aktif (hanya untuk pengembangan lokal)."
                    : "Menunggu konfigurasi penyedia pembayaran terverifikasi pada server."}
                </AppText>
              </View>
              <PillButton
                label={
                  isUpgrading
                    ? "Memproses..."
                    : !paymentReadiness.canCheckout
                    ? "Pembayaran Belum Tersedia"
                    : paymentReadiness.stripeConfigured
                    ? `Lanjut ke Checkout`
                    : `Uji di Sandbox`
                }
                variant={paymentReadiness.canCheckout ? "primary" : "soft"}
                icon={<LineIcon name="crown" size={15} color={paymentReadiness.canCheckout ? "#ffffff" : "#121a16"} />}
                onPress={handleUpgrade}
                disabled={isUpgrading || !paymentReadiness.canCheckout}
                accessibilityLabel={`Checkout ${SUBSCRIPTION_PLANS[selectedPlan].name}`}
              />
            </Surface>
          </FadeInView>

          {/* Feature Comparison Matrix */}
          <FadeInView index={3}>
            <Surface>
              <CardHead
                title="Perbandingan fitur"
                subtitle="Fitur dasar tetap gratis selamanya"
                right={
                  <View className="flex-row items-center gap-2 sm:gap-6">
                    <AppText weight="semibold" className="text-[11px] sm:text-xs text-[#56605a] w-14 sm:w-16 text-center">
                      Gratis
                    </AppText>
                    <AppText weight="bold" className="text-[11px] sm:text-xs text-[#0e7a52] w-16 sm:w-20 text-center">
                      Premium
                    </AppText>
                  </View>
                }
              />

              {COMPARISON_ROWS.map((row, index) => (
                <ListRow
                  key={index}
                  first={index === 0}
                  last={index === COMPARISON_ROWS.length - 1}
                  title={row.feature}
                  right={
                    <View className="flex-row items-center gap-2 sm:gap-6 flex-shrink-0">
                      <View className="w-14 sm:w-16 items-center justify-center">
                        {typeof row.free === "string" ? (
                          <AppText weight="regular" className="text-[11px] sm:text-xs text-[#56605a] text-center">
                            {row.free}
                          </AppText>
                        ) : row.free ? (
                          <LineIcon name="check" size={15} color="#0e7a52" />
                        ) : (
                          <LineIcon name="close" size={14} color="#8a938d" />
                        )}
                      </View>

                      <View className="w-16 sm:w-20 items-center justify-center">
                        {typeof row.premium === "string" ? (
                          <AppText weight="semibold" className="text-[11px] sm:text-xs text-[#0e7a52] text-center">
                            {row.premium}
                          </AppText>
                        ) : row.premium ? (
                          <LineIcon name="check" size={16} color="#0e7a52" />
                        ) : (
                          <LineIcon name="close" size={14} color="#8a938d" />
                        )}
                      </View>
                    </View>
                  }
                />
              ))}
            </Surface>
          </FadeInView>

          {/* Transparent Subscription Policy */}
          <FadeInView index={4}>
            <Surface className="bg-[#f0f4f1]">
              <AppText weight="semibold" className="text-xs text-[#121a16] mb-1">
                Kebijakan Langganan Transparan
              </AppText>
              <AppText weight="regular" className="text-[11px] text-[#56605a] leading-relaxed">
                Better Life tidak pernah mengaktifkan paket berbayar tanpa bukti pembayaran terverifikasi dan tidak menggunakan hitung mundur palsu. Saat dibatalkan, akses Premium Anda tetap aktif hingga masa aktif berakhir dan seluruh catatan jurnal Anda tetap tersimpan utuh.
              </AppText>
            </Surface>
          </FadeInView>
        </View>
      </ScrollView>

      {/* Cancellation Confirmation Dialog */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-[#121a16]/50 items-center justify-center px-6"
          onPress={() => setCancelModalVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ boxShadow: SURFACE_SHADOW } as any}
            className="w-full max-w-[380px] bg-[#fbfdfc] rounded-[24px] border border-[#e6eae7] p-5"
          >
            <AppText weight="semibold" className="text-lg text-[#121a16] mb-1.5">
              Batalkan perpanjangan otomatis?
            </AppText>
            <AppText weight="regular" className="text-xs text-[#56605a] leading-relaxed mb-5">
              Anda tetap memiliki akses penuh ke fitur Premium hingga akhir periode penagihan saat ini. Riwayat makanan dan data profil Anda tidak akan pernah dihapus.
            </AppText>

            <View className="flex-row justify-end gap-2.5">
              <PillButton
                label="Pertahankan"
                variant="soft"
                onPress={() => setCancelModalVisible(false)}
              />
              <PressableScale
                onPress={handleCancelAutoRenew}
                className="px-4 min-h-[44px] rounded-full bg-[#b3301b] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Konfirmasi batalkan perpanjangan otomatis"
              >
                <AppText weight="semibold" className="text-xs text-white">
                  Ya, batalkan
                </AppText>
              </PressableScale>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}
