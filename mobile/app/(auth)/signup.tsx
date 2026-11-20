import React, { useState, useRef } from "react";
import { View, Image } from "react-native";
import { useRouter } from "expo-router";
import {
  AppText,
  Button,
  Divider,
  FadeInView,
  GoogleSignInModal,
  FlowScreen,
  FlowTitle,
  TextField,
  FormAlert,
  TextLink,
  LineIcon,
  PressableScale,
} from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { BrandImages, IconRenderer } from "@/constants/Assets";
import { Colors } from "@/constants/DesignTokens";

const TOTAL_SIGNUP_STEPS = 3;

export default function SignupScreen() {
  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);

  const [step, setStep] = useState<number>(1);
  const [stepDir, setStepDir] = useState<1 | -1>(1);

  // Step 1: Email
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Step 2: Username / Name & Phone
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const phoneRef = useRef<any>(null);

  // Step 3: Password & Confirmation
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const confirmRef = useRef<any>(null);

  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleBack = () => {
    setGeneralError("");
    if (step > 1) {
      setStepDir(-1);
      setStep(step - 1);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/get-started");
    }
  };

  const handleStep1Continue = async () => {
    if (isLoading) return;
    setEmailError("");
    setGeneralError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError("Alamat email wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Masukkan format alamat email yang valid.");
      return;
    }

    setIsLoading(true);
    try {
      const availability = await useAuthStore.getState().checkEmailAvailability(trimmedEmail);
      setIsLoading(false);

      if (availability.error) {
        setGeneralError(availability.error);
        return;
      }

      if (!availability.available) {
        setEmailError("Email ini sudah terdaftar. Silakan masuk ke akun Anda.");
        return;
      }

      if (!fullName.trim()) {
        const prefix = trimmedEmail.split("@")[0].replace(/[._-]/g, " ");
        const formatted = prefix
          .split(" ")
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        if (formatted.length >= 2) {
          setFullName(formatted);
        }
      }

      setStepDir(1);
      setStep(2);
    } catch {
      setIsLoading(false);
      setGeneralError("Server pendaftaran tidak dapat dihubungi. Periksa koneksi Anda.");
    }
  };

  const handleStep2ProfileContinue = () => {
    setFullNameError("");
    setPhoneError("");
    setGeneralError("");
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    let valid = true;
    if (!trimmedName || trimmedName.length < 2) {
      setFullNameError("Username / nama lengkap minimal 2 karakter.");
      valid = false;
    }
    if (trimmedPhone && (trimmedPhone.length < 6 || trimmedPhone.length > 30)) {
      setPhoneError("Nomor telepon harus 6 hingga 30 karakter, atau kosongkan bila tidak digunakan.");
      valid = false;
    }
    if (!valid) return;
    setStepDir(1);
    setStep(3);
  };

  const handleFinalSignup = async () => {
    if (isLoading) return;
    setPasswordError("");
    setConfirmError("");
    setGeneralError("");

    let valid = true;
    if (!password) {
      setPasswordError("Kata sandi wajib diisi.");
      valid = false;
    } else if (password.length < 6) {
      setPasswordError("Kata sandi minimal 6 karakter.");
      valid = false;
    } else if (password.length > 72) {
      setPasswordError("Kata sandi maksimal 72 karakter.");
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmError("Konfirmasi kata sandi wajib diisi.");
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmError("Konfirmasi kata sandi belum sama.");
      valid = false;
    }

    if (!valid) return;

    setIsLoading(true);
    try {
      const result = await signup({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });

      setIsLoading(false);

      if (!result.success) {
        setGeneralError(result.error || "Gagal membuat akun. Silakan coba lagi.");
        return;
      }

      router.replace("/(onboarding)");
    } catch {
      setIsLoading(false);
      setGeneralError("Terjadi kesalahan saat mendaftarkan akun.");
    }
  };

  const handlePrimaryAction = () => {
    if (step === 1) handleStep1Continue();
    else if (step === 2) handleStep2ProfileContinue();
    else handleFinalSignup();
  };

  const primaryTitle =
    step === 1
      ? isLoading
        ? "Memeriksa Email..."
        : "Lanjutkan"
      : step === 2
      ? "Lanjutkan ke Kata Sandi"
      : isLoading
      ? "Membuat Akun..."
      : "Selesaikan & Mulai Personalisasi";

  return (
    <FlowScreen
      onBack={handleBack}
      step={{ current: step, total: TOTAL_SIGNUP_STEPS }}
      topRight={
        <TextLink
          label="Masuk"
          onPress={() => router.push("/(auth)/login")}
        />
      }
      footer={
        <View className="gap-2.5">
          <Button
            title={primaryTitle}
            size="lg"
            loading={isLoading}
            onPress={handlePrimaryAction}
            accessibilityLabel={primaryTitle}
          />
          <View className="flex-row items-center justify-center gap-1.5 pt-1">
            <AppText weight="medium" className="text-[14px] text-muted">
              Sudah punya akun?
            </AppText>
            <TextLink
              label="Masuk di sini"
              onPress={() => router.push("/(auth)/login")}
            />
          </View>
        </View>
      }
    >
      <View className="flex-row items-center gap-2.5 mb-3">
        <Image
          source={BrandImages.wordmarkPng}
          style={{ width: 122, height: 38 }}
          resizeMode="contain"
          accessibilityLabel="Better Life Logo"
        />
      </View>

      <FormAlert message={generalError} />

      {/* STEP 1: EMAIL REGISTRATION */}
      {step === 1 && (
        <FadeInView key="signup-step-1" index={0} translateX={stepDir * 18} translateY={0}>
          <FlowTitle
            eyebrow="Langkah 1 dari 3 · Email"
            title="Daftarkan email Anda"
            caption="Gunakan alamat email aktif untuk membuat akun dan menyinkronkan catatan harian Anda."
          />

          <TextField
            label="Alamat Email"
            icon="mail"
            placeholder="nama@email.com"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (emailError) setEmailError("");
              if (generalError) setGeneralError("");
            }}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleStep1Continue}
            accessibilityLabel="Input alamat email pendaftaran"
          />

          <Divider label="ATAU" className="my-5" />

          <PressableScale
            onPress={() => setShowGoogleModal(true)}
            pressedScale={0.98}
            style={{
              backgroundColor: "#fbfdfc",
              borderWidth: 1,
              borderColor: "#d5dbd7",
            }}
            className="w-full h-[52px] flex-row items-center justify-center rounded-full gap-x-3"
            accessibilityRole="button"
            accessibilityLabel="Daftar dengan Google"
          >
            <IconRenderer name="Google" size={20} />
            <AppText weight="bold" className="text-[15px] text-ink">
              Daftar Cepat dengan Google
            </AppText>
          </PressableScale>
        </FadeInView>
      )}

      {/* STEP 2: USERNAME / PROFILE CREATION */}
      {step === 2 && (
        <FadeInView key="signup-step-2" index={0} translateX={stepDir * 18} translateY={0}>
          <FlowTitle
            eyebrow="Langkah 2 dari 3 · Profil"
            title="Buat username Anda"
          />

          <View className="gap-4">
            <TextField
              label="Username / Nama Lengkap"
              icon="user"
              placeholder="contoh: Daffa Pratama"
              value={fullName}
              onChangeText={(val) => {
                setFullName(val);
                if (fullNameError) setFullNameError("");
              }}
              error={fullNameError}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              accessibilityLabel="Input username atau nama lengkap"
            />

            <TextField
              ref={phoneRef}
              label="Nomor Telepon (Opsional)"
              placeholder="contoh: +62 812-3456-7890"
              value={phone}
              onChangeText={(val) => {
                setPhone(val);
                if (phoneError) setPhoneError("");
              }}
              error={phoneError}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleStep2ProfileContinue}
              hint="Digunakan hanya untuk pemulihan akun."
              accessibilityLabel="Input nomor telepon opsional"
            />
          </View>
        </FadeInView>
      )}

      {/* STEP 3: PASSWORD & CONFIRMATION */}
      {step === 3 && (
        <FadeInView key="signup-step-3" index={0} translateX={stepDir * 18} translateY={0}>
          <FlowTitle
            eyebrow="Langkah 3 dari 3 · Keamanan"
            title="Buat kata sandi"
            caption="Gunakan minimal 6 karakter."
          />

          <View className="gap-4">
            <TextField
              label="Kata Sandi Baru"
              icon="lock"
              password
              placeholder="Minimal 6 karakter"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (passwordError) setPasswordError("");
                if (generalError) setGeneralError("");
              }}
              error={passwordError}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              accessibilityLabel="Input kata sandi baru"
            />

            <TextField
              ref={confirmRef}
              label="Konfirmasi Kata Sandi"
              icon="lock"
              password
              placeholder="Ketik ulang kata sandi"
              value={confirmPassword}
              onChangeText={(val) => {
                setConfirmPassword(val);
                if (confirmError) setConfirmError("");
                if (generalError) setGeneralError("");
              }}
              error={confirmError}
              returnKeyType="done"
              onSubmitEditing={handleFinalSignup}
              accessibilityLabel="Input konfirmasi kata sandi"
            />
          </View>

          {/* Live Password Checklist */}
          <View className="mt-4 p-3.5 rounded-[16px] bg-card border border-line gap-2">
            {[
              {
                ok: password.length >= 6,
                text: "Minimal 6 karakter",
              },
              {
                ok: password.length > 0 && password === confirmPassword,
                text: "Konfirmasi kata sandi cocok",
              },
            ].map((rule, idx) => (
              <View key={idx} className="flex-row items-center gap-2.5">
                <View
                  className="w-5 h-5 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: rule.ok ? Colors.primary.DEFAULT : "#e6eae7",
                  }}
                >
                  <LineIcon
                    name="check"
                    size={12}
                    color={rule.ok ? "#ffffff" : "#8a938d"}
                    strokeWidth={2.5}
                  />
                </View>
                <AppText
                  weight={rule.ok ? "semibold" : "medium"}
                  className={`text-[13px] ${rule.ok ? "text-ink" : "text-muted"}`}
                >
                  {rule.text}
                </AppText>
              </View>
            ))}
          </View>
        </FadeInView>
      )}

      <GoogleSignInModal
        visible={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
      />
    </FlowScreen>
  );
}
