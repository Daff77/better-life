import React, { useState, useRef } from "react";
import { View, TextInput, Pressable, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import {
  AppText,
  Button,
  Divider,
  GoogleSignInModal,
  FlowScreen,
  FlowTitle,
  TextField,
  FormAlert,
  TextLink,
  LineIcon,
} from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { DEFAULT_DEMO_ACCOUNT } from "@/lib/sessionStorage";
import { BrandImages, IconRenderer } from "@/constants/Assets";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const passwordRef = useRef<any>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const validateForm = () => {
    let isValid = true;
    setIdentifierError("");
    setPasswordError("");
    setGeneralError("");

    const trimmed = identifier.trim();
    if (!trimmed) {
      setIdentifierError("Masukkan email atau username Anda.");
      isValid = false;
    } else if (trimmed.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setIdentifierError("Format alamat email belum valid.");
      isValid = false;
    } else if (trimmed.length < 2) {
      setIdentifierError("Masukkan minimal 2 karakter.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Kata sandi wajib diisi.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Kata sandi minimal 6 karakter.");
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (isLoading) return;
    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError("");

    try {
      const result = await login(identifier.trim(), password);
      setIsLoading(false);

      if (!result.success) {
        setGeneralError(result.error || "Email/username atau kata sandi tidak sesuai.");
        return;
      }

      const onboardingCompleted = useAuthStore.getState().onboardingCompleted;
      if (!onboardingCompleted) {
        router.replace("/(onboarding)");
      } else {
        router.replace("/(app)/(tabs)");
      }
    } catch {
      setIsLoading(false);
      setGeneralError("Terjadi kendala saat masuk. Silakan coba kembali.");
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/get-started");
    }
  };

  return (
    <FlowScreen
      onBack={handleBack}
      topRight={
        <TextLink
          label="Buat akun"
          onPress={() => router.push("/(auth)/signup")}
        />
      }
      footer={
        <View className="gap-2.5">
          <Button
            title={isLoading ? "Memverifikasi..." : "Masuk ke Akun"}
            size="lg"
            loading={isLoading}
            onPress={handleLogin}
            accessibilityLabel="Masuk ke akun Better Life"
          />
          <View className="flex-row items-center justify-center gap-1.5 pt-1">
            <AppText weight="medium" className="text-[14px] text-muted">
              Belum punya akun?
            </AppText>
            <TextLink
              label="Daftar sekarang"
              onPress={() => router.push("/(auth)/signup")}
            />
          </View>
        </View>
      }
    >
      <View className="flex-row items-center gap-2.5 mb-4">
        <Image
          source={BrandImages.logoPng}
          style={{ width: 42, height: 42, marginLeft: -4 }}
          resizeMode="contain"
          accessibilityLabel="Better Life Logo"
        />
      </View>

      <FlowTitle
        eyebrow="Selamat datang kembali"
        title="Masuk ke akun Anda"
        caption="Lanjutkan catatan kalori, rencana menu mingguan, dan progres kesehatan Anda."
      />

      <FormAlert message={generalError} />

      <View className="gap-4">
        <TextField
          label="Email atau Username"
          icon="user"
          placeholder="contoh: daffa@gmail.com"
          value={identifier}
          onChangeText={(text) => {
            setIdentifier(text);
            if (identifierError) setIdentifierError("");
            if (generalError) setGeneralError("");
          }}
          error={identifierError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          accessibilityLabel="Input email atau username"
        />

        <TextField
          ref={passwordRef}
          label="Kata Sandi"
          icon="lock"
          password
          placeholder="Masukkan kata sandi"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError) setPasswordError("");
            if (generalError) setGeneralError("");
          }}
          error={passwordError}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          accessibilityLabel="Input kata sandi"
        />
      </View>

      <View className="flex-row items-center justify-between mt-3 mb-5">
        <Pressable
          onPress={() => {
            setIdentifier(DEFAULT_DEMO_ACCOUNT.email);
            setPassword(DEFAULT_DEMO_ACCOUNT.password);
            setIdentifierError("");
            setPasswordError("");
            setGeneralError("");
          }}
          className="flex-row items-center gap-1.5 py-1.5 px-3 rounded-full bg-primary-light"
          accessibilityRole="button"
          accessibilityLabel="Isi cepat akun contoh"
        >
          <LineIcon name="sparkle" size={14} color="#0b6b47" />
          <AppText weight="semibold" className="text-[12.5px] text-primary-text">
            Isi Akun Demo
          </AppText>
        </Pressable>

        <TextLink
          label="Lupa kata sandi?"
          onPress={() =>
            Alert.alert(
              "Pemulihan Kata Sandi",
              "Untuk akun demo gunakan email 'daffa@gmail.com' dan kata sandi 'password123', atau gunakan kata sandi yang Anda buat saat pendaftaran."
            )
          }
        />
      </View>

      <Divider label="ATAU" className="my-3" />

      <Pressable
        onPress={() => setShowGoogleModal(true)}
        style={({ pressed }) => [
          {
            backgroundColor: "#fbfdfc",
            borderWidth: 1,
            borderColor: "#d5dbd7",
          },
          pressed ? { opacity: 0.88, transform: [{ scale: 0.985 }] } : null,
        ]}
        className="w-full h-[52px] flex-row items-center justify-center rounded-full gap-x-3 mt-1"
        accessibilityRole="button"
        accessibilityLabel="Masuk dengan Google"
      >
        <IconRenderer name="Google" size={20} />
        <AppText weight="bold" className="text-[15px] text-ink">
          Lanjutkan dengan Google
        </AppText>
      </Pressable>

      <GoogleSignInModal
        visible={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
      />
    </FlowScreen>
  );
}
