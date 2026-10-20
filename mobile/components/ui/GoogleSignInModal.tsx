import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "./AppText";
import { Input } from "./Input";
import { Button } from "./Button";
import { IconRenderer } from "@/constants/Assets";
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
  const [viewMode, setViewMode] = useState<"connecting" | "setup" | "quickTest">("connecting");

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

  const handleQuickDemoLogin = async (email: string, name: string) => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle({ name, email });
      setIsLoading(false);
      onClose();

      const onboardingCompleted = useAuthStore.getState().onboardingCompleted;
      if (!onboardingCompleted || result.isNewUser) {
        router.replace("/(onboarding)");
      } else {
        router.replace("/(app)/(tabs)");
      }
    } catch {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    if (isLoading) return;
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleModalClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center p-4"
        onPress={handleModalClose}
      >
        <Pressable
          className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-neutral-border"
          onPress={(e) => e.stopPropagation()}
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
            <View className="mb-4 p-3 bg-status-error/10 border border-status-error/20 rounded-xl">
              <AppText weight="medium" className="text-xs text-status-error text-center">
                {errorMessage}
              </AppText>
            </View>
          )}

          {/* Mode 1: Options & Manual trigger */}
          {viewMode === "connecting" && (
            <View className="py-2 items-center w-full">
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

                  <Button
                    title="⚡ Masuk Cepat Akun Google (Demo / Uji Coba)"
                    variant="social"
                    onPress={() => handleQuickDemoLogin("daffa.google@gmail.com", "Daffa (Google)")}
                    className="w-full"
                  />

                  <TouchableOpacity
                    onPress={handleModalClose}
                    className="py-2.5 items-center justify-center rounded-xl bg-neutral-surface border border-neutral-border mt-1"
                  >
                    <AppText weight="bold" className="text-xs text-neutral-dark">
                      Batal / Kembali ke Form Login
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setViewMode("setup")}
                    className="py-1 self-center mt-1"
                  >
                    <AppText weight="semibold" className="text-[11px] text-neutral-muted">
                      ⚙ Pengaturan Google Client ID
                    </AppText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Mode 2: Client ID Setup Guide & Input */}
          {viewMode === "setup" && (
            <View className="mb-2">
              <View className="bg-neutral-surface border border-neutral-border rounded-2xl p-3.5 mb-4">
                <AppText weight="bold" className="text-xs text-neutral-dark mb-1">
                  Petunjuk Google OAuth Web Client ID:
                </AppText>
                <AppText weight="medium" className="text-[11px] text-neutral-muted leading-4">
                  Google mewajibkan Client ID bertipe <AppText weight="bold" className="text-neutral-dark">Web Application</AppText>. Client ID bertipe Android/Desktop ditolak Google dengan error <AppText weight="bold" className="text-status-error">invalid_request</AppText>.
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

              <TouchableOpacity
                onPress={handleRestoreDefault}
                className="py-2.5 items-center justify-center rounded-xl bg-secondary-soft border border-secondary mb-3"
              >
                <AppText weight="bold" className="text-xs text-primary">
                  ↺ Pulihkan ke Web Client ID Bawaan (Aktif)
                </AppText>
              </TouchableOpacity>

              <View className="flex-row items-center justify-between pt-1">
                <TouchableOpacity
                  onPress={() => setViewMode("quickTest")}
                  className="py-1"
                >
                  <AppText weight="semibold" className="text-xs text-neutral-muted">
                    ⚡ Mode Uji Coba Cepat
                  </AppText>
                </TouchableOpacity>

                {hasConfiguredId && (
                  <TouchableOpacity
                    onPress={() => setViewMode("connecting")}
                    className="py-1"
                  >
                    <AppText weight="bold" className="text-xs text-primary">
                      Kembali
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Mode 3: Quick Test Account (for immediate testing without waiting for Cloud Console) */}
          {viewMode === "quickTest" && (
            <View className="mb-2">
              <AppText weight="semibold" className="text-xs text-neutral-muted mb-3 text-center">
                Pilih akun instan untuk mencoba alur aplikasi sebelum Google Client ID dibuat:
              </AppText>

              <TouchableOpacity
                disabled={isLoading}
                onPress={() => handleQuickDemoLogin("daffa@gmail.com", "Daffa Pratama")}
                className="flex-row items-center p-3 rounded-2xl border border-neutral-border hover:bg-neutral-surface active:bg-neutral-surface/80 mb-2"
              >
                <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center mr-3">
                  <AppText weight="bold" className="text-white text-base">D</AppText>
                </View>
                <View className="flex-1">
                  <AppText weight="bold" className="text-sm text-neutral-dark">Daffa Pratama</AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">daffa@gmail.com</AppText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isLoading}
                onPress={() => handleQuickDemoLogin("johndoe25@gmail.com", "John Doe")}
                className="flex-row items-center p-3 rounded-2xl border border-neutral-border hover:bg-neutral-surface active:bg-neutral-surface/80 mb-3"
              >
                <View className="w-10 h-10 rounded-full bg-emerald-600 items-center justify-center mr-3">
                  <AppText weight="bold" className="text-white text-base">J</AppText>
                </View>
                <View className="flex-1">
                  <AppText weight="bold" className="text-sm text-neutral-dark">John Doe</AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">johndoe25@gmail.com</AppText>
                </View>
              </TouchableOpacity>

              <Button
                title="Kembali ke Setup Client ID"
                variant="outline"
                onPress={() => setViewMode("setup")}
                className="w-full"
              />
            </View>
          )}

          {/* Footer Close */}
          <TouchableOpacity
            onPress={handleModalClose}
            className="pt-3 items-center"
          >
            <AppText weight="bold" className="text-xs text-neutral-muted">
              Tutup
            </AppText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
