import React, { useState, useEffect } from "react";
import {
  View,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "./AppText";
import { FadeInView } from "./FadeInView";
import { Input } from "./Input";
import { Button } from "./Button";
import { ModalSheet } from "./ModalSheet";
import { PressableScale } from "./PressableScale";
import { IconRenderer, SettingsIconSvg, RefreshIconSvg, ZapIconSvg } from "@/constants/Assets";
import { useAuthStore } from "@/stores/useAuthStore";
import { googleAuthService } from "@/lib/googleAuth";

export interface GoogleSignInModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (user: { name: string; email: string; isNewUser?: boolean }) => void;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const router = useRouter();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clientIdInput, setClientIdInput] = useState("");
  const [hasConfiguredId, setHasConfiguredId] = useState(false);
  const [viewMode, setViewMode] = useState<"connecting" | "setup">("connecting");

  useEffect(() => {
    if (visible) {
      const currentId = googleAuthService.getClientId();
      setHasConfiguredId(!!currentId);
      setClientIdInput(currentId);
      setErrorMessage(null);
      setIsLoading(false);
      setViewMode("connecting");
    }
  }, [visible]);

  const launchRealGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await googleAuthService.signInWithGoogle();

    if (result.success && result.user) {
      const authResult = await loginWithGoogle(result.user);
      setIsLoading(false);
      if (!authResult.success) { setErrorMessage(authResult.error || "Login Google gagal."); return; }
      onClose();

      if (onSuccess) {
        onSuccess({
          name: result.user.name,
          email: result.user.email,
          isNewUser: authResult.isNewUser,
        });
        return;
      }

      const onboardingCompleted = useAuthStore.getState().onboardingCompleted;
      if (!onboardingCompleted || authResult.isNewUser) {
        router.replace("/(onboarding)");
      } else {
        router.replace("/(app)/(tabs)");
      }
    } else {
      setIsLoading(false);
      if (result.error === "NO_CLIENT_ID") {
        setViewMode("setup");
      } else {
        setErrorMessage(result.error || "Gagal melakukan autentikasi Google.");
      }
    }
  };

  const handleSaveAndConnect = async () => {
    const trimmed = clientIdInput.trim();
    if (!trimmed) {
      setErrorMessage("Silakan masukkan Google Client ID Anda.");
      return;
    }

    googleAuthService.setClientId(trimmed);
    setHasConfiguredId(true);
    setViewMode("connecting");
  };

  const handleRestoreDefault = () => {
    googleAuthService.resetClientId();
    const defaultId = googleAuthService.getClientId();
    setClientIdInput(defaultId);
    setHasConfiguredId(true);
    setErrorMessage(null);
    setViewMode("connecting");
  };


  const handleModalClose = () => {
    if (isLoading) return;
    setErrorMessage(null);
    onClose();
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={handleModalClose}
      variant="dialog"
      showHandle={false}
      accessibilityLabel="Google Authentication"
      contentClassName="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-neutral-border"
    >
            {/* Header */}
            <View className="items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-white shadow-sm border border-neutral-border items-center justify-center mb-2.5">
                <IconRenderer name="Google" size={28} />
              </View>
              <AppText weight="bold" className="text-xl text-neutral-dark text-center">
                Google Authentication
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center mt-0.5">
                Login resmi menggunakan akun Google Anda
              </AppText>
            </View>

            {/* Error Message */}
            {!!errorMessage && (
              <FadeInView duration={180} translateY={4}>
                <View className="mb-4 p-3 bg-bad-soft border border-bad/25 rounded-xl">
                  <AppText weight="medium" className="text-xs text-bad text-center">
                    {errorMessage}
                  </AppText>
                </View>
              </FadeInView>
            )}

            {/* Mode 1: Options & Manual trigger */}
            {viewMode === "connecting" && (
              <FadeInView key="mode-connecting" duration={180} translateY={4} className="py-2 items-center w-full">
                {isLoading ? (
                  <View className="items-center py-4">
                    <ActivityIndicator size="large" color="#4285F4" className="mb-3" />
                    <AppText weight="bold" className="text-sm text-neutral-dark text-center mb-1">
                      Menghubungkan ke Google...
                    </AppText>
                    <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs">
                      Silakan selesaikan login di jendela yang terbuka.
                    </AppText>
                  </View>
                ) : (
                  <View className="w-full gap-y-3">
                    <Button
                      title="Masuk dengan Akun Google (Resmi)"
                      variant="primary"
                      onPress={launchRealGoogleLogin}
                      className="w-full"
                    />


                    <PressableScale
                      onPress={handleModalClose}
                      pressedScale={0.97}
                      className="py-2.5 min-h-[44px] items-center justify-center rounded-xl bg-card-2 border border-neutral-border mt-1"
                    >
                      <AppText weight="bold" className="text-xs text-neutral-dark">
                        Batal / Kembali ke Form Login
                      </AppText>
                    </PressableScale>

                    <PressableScale
                      onPress={() => setViewMode("setup")}
                      pressedScale={0.96}
                      className="py-1 self-center mt-1 flex-row items-center gap-x-1.5"
                    >
                      <SettingsIconSvg size={14} color="#56605a" />
                      <AppText weight="semibold" className="text-[11px] text-neutral-muted">
                        Pengaturan Google Client ID
                      </AppText>
                    </PressableScale>
                  </View>
                )}
              </FadeInView>
            )}

            {/* Mode 2: Client ID Setup Guide & Input */}
            {viewMode === "setup" && (
              <FadeInView key="mode-setup" duration={180} translateY={4} className="mb-2">
                <View className="bg-card-2 border border-neutral-border rounded-2xl p-3.5 mb-4">
                  <AppText weight="bold" className="text-xs text-neutral-dark mb-1">
                    Petunjuk Google OAuth Web Client ID:
                  </AppText>
                  <AppText weight="medium" className="text-[11px] text-neutral-muted leading-4">
                    Google mewajibkan Client ID bertipe <AppText weight="bold" className="text-neutral-dark">Web Application</AppText>. Client ID bertipe Android/Desktop ditolak Google dengan error <AppText weight="bold" className="text-bad">invalid_request</AppText>.
                  </AppText>
                  <View className="mt-2 bg-white rounded-lg p-2 border border-neutral-border-light">
                    <AppText weight="semibold" className="text-[10px] text-neutral-dark">
                      1. Buka <AppText weight="bold" className="text-primary" onPress={() => Linking.openURL("https://console.cloud.google.com/apis/credentials")}>console.cloud.google.com/apis/credentials</AppText>
                    </AppText>
                    <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                      2. Buat OAuth Client ID (Pilih: <AppText weight="bold" className="text-neutral-dark">Web application</AppText>)
                    </AppText>
                    <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                      3. Tambahkan Authorized Redirect URI: <AppText weight="bold" className="text-neutral-dark">{googleAuthService.getRedirectUri()}</AppText>
                    </AppText>
                  </View>
                </View>

                <Input
                  label="GOOGLE CLIENT ID (WEB APPLICATION)"
                  placeholder="xxxxxx-xxxxxxxx.apps.googleusercontent.com"
                  value={clientIdInput}
                  onChangeText={(val) => {
                    setClientIdInput(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveAndConnect}
                />

                <Button
                  title="Simpan Client ID"
                  variant="primary"
                  loading={isLoading}
                  onPress={handleSaveAndConnect}
                  className="w-full mb-2"
                />

                <PressableScale
                  onPress={handleRestoreDefault}
                  pressedScale={0.97}
                  className="py-2.5 items-center justify-center rounded-xl bg-secondary-soft border border-secondary mb-3 flex-row items-center gap-x-1.5"
                >
                  <RefreshIconSvg size={15} color="#0b6b47" />
                  <AppText weight="bold" className="text-xs text-primary">
                    Pulihkan ke Web Client ID Bawaan (Aktif)
                  </AppText>
                </PressableScale>

                <View className="flex-row items-center justify-between pt-1">

                  {hasConfiguredId && (
                    <PressableScale
                      onPress={() => setViewMode("connecting")}
                      pressedScale={0.96}
                      className="py-1"
                    >
                      <AppText weight="bold" className="text-xs text-primary">
                        Kembali
                      </AppText>
                    </PressableScale>
                  )}
                </View>
              </FadeInView>
            )}


            {/* Footer Close */}
            <PressableScale
              onPress={handleModalClose}
              pressedScale={0.96}
              className="pt-3 items-center"
            >
              <AppText weight="bold" className="text-xs text-neutral-muted">
                Tutup
              </AppText>
            </PressableScale>
    </ModalSheet>
  );
};
