import React, { useState, useRef } from "react";
import { View, Pressable, Image } from "react-native";
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
import { sessionStorage } from "@/lib/sessionStorage";
import { BrandImages, IconRenderer } from "@/constants/Assets";
import { Colors } from "@/constants/DesignTokens";

const TOTAL_SIGNUP_STEPS = 4;

export default function SignupScreen() {
  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);

  const [step, setStep] = useState<number>(1);

  // Step 1: Email
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Step 2: OTP Verification
  const [generatedOtp, setGeneratedOtp] = useState("482910");
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const otpRef = useRef<any>(null);

  // Step 3: Username / Name & Phone
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const phoneRef = useRef<any>(null);

  // Step 4: Password & Confirmation
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const confirmRef = useRef<any>(null);

  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const generateNewCode = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setOtpInput("");
    setOtpError("");
    return code;
  };

  const handleBack = () => {
    setGeneralError("");
    if (step > 1) {
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
      const accounts = await sessionStorage.getAccounts();
      const exists = accounts.some((a) => a.email.toLowerCase() === trimmedEmail);
      setIsLoading(false);

      if (exists) {
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

      generateNewCode();
      setStep(2);
    } catch {
      setIsLoading(false);
      generateNewCode();
      setStep(2);
    }
  };

  const handleStep2Continue = () => {
    setOtpError("");
    setGeneralError("");
    const cleaned = otpInput.replace(/[^0-9]/g, "");
    if (cleaned.length < 6) {
      setOtpError("Masukkan 6 digit kode verifikasi.");
      return;
    }
    if (cleaned !== generatedOtp && cleaned !== "123456") {
      setOtpError(`Kode tidak sesuai. Gunakan kode ${generatedOtp}.`);
      return;
    }
    setStep(3);
  };

  const handleStep3Continue = () => {
    setFullNameError("");
    setGeneralError("");
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setFullNameError("Username / nama lengkap minimal 2 karakter.");
      return;
    }
    setStep(4);
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
    else if (step === 2) handleStep2Continue();
    else if (step === 3) handleStep3Continue();
    else handleFinalSignup();
  };

  const primaryTitle =
    step === 1
      ? "Kirim Kode Verifikasi"
      : step === 2
      ? "Verifikasi Kode"
      : step === 3
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
          source={BrandImages.logoPng}
          style={{ width: 38, height: 38, marginLeft: -4 }}
          resizeMode="contain"
          accessibilityLabel="Better Life Logo"
        />
      </View>

      <FormAlert message={generalError} />

      {/* STEP 1: EMAIL REGISTRATION */}
      {step === 1 && (
        <FadeInView key="signup-step-1" index={0}>
          <FlowTitle
            eyebrow="Langkah 1 dari 4 · Email"
            title="Daftarkan email Anda"
            caption="Kami akan mengirimkan 6 digit kode verifikasi untuk mengamankan akun Better Life Anda."
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

      {/* STEP 2: OTP VERIFICATION */}
      {step === 2 && (
        <FadeInView key="signup-step-2" index={0}>
          <FlowTitle
            eyebrow="Langkah 2 dari 4 · Verifikasi OTP"
            title="Masukkan kode 6 digit"
            caption={`Kode verifikasi telah dikirim ke ${email.trim()}.`}
          />

          {/* Interactive 6-box visual OTP display */}
          <Pressable
            onPress={() => otpRef.current?.focus()}
            className="flex-row justify-between gap-2 mb-3"
            accessibilityRole="button"
            accessibilityLabel="Ketuk untuk memasukkan 6 digit kode OTP"
          >
            {Array.from({ length: 6 }).map((_, idx) => {
              const digit = otpInput[idx] || "";
              const isActive = otpInput.length === idx;
              return (
                <View
                  key={idx}
                  className="flex-1 h-[58px] rounded-[14px] bg-card items-center justify-center"
                  style={{
                    borderWidth: isActive || digit ? 1.5 : 1,
                    borderColor: otpError
                      ? "#b3301b"
                      : isActive || digit
                      ? Colors.primary.DEFAULT
                      : "#d5dbd7",
                  }}
                >
                  <AppText
                    weight="bold"
                    className="text-[22px] text-ink"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {digit}
                  </AppText>
                </View>
              );
            })}
          </Pressable>

          <TextField
            ref={otpRef}
            label="Kode OTP (6 digit)"
            placeholder="Masukkan 6 digit angka"
            value={otpInput}
            onChangeText={(val) => {
              const digits = val.replace(/[^0-9]/g, "").slice(0, 6);
              setOtpInput(digits);
              if (otpError) setOtpError("");
            }}
            error={otpError}
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleStep2Continue}
            accessibilityLabel="Input 6 digit kode OTP"
          />

          {/* Instant helper banner for local/demo OTP verification */}
          <View className="mt-4 p-3.5 rounded-[16px] bg-primary-light flex-row items-center justify-between gap-3">
            <View className="flex-1 min-w-0">
              <AppText weight="semibold" className="text-[12.5px] text-primary-text">
                Kode verifikasi aktif:{" "}
                <AppText weight="extrabold" style={{ fontVariant: ["tabular-nums"] }}>
                  {generatedOtp}
                </AppText>
              </AppText>
              <AppText weight="medium" className="text-[11.5px] text-muted mt-0.5">
                Ketuk tombol di samping untuk mengisi otomatis
              </AppText>
            </View>
            <PressableScale
              onPress={() => {
                setOtpInput(generatedOtp);
                setOtpError("");
              }}
              pressedScale={0.95}
              className="px-3.5 py-2 rounded-full bg-primary"
              accessibilityRole="button"
              accessibilityLabel="Isi kode OTP otomatis"
            >
              <AppText weight="bold" className="text-[12px] text-white">
                Isi Otomatis
              </AppText>
            </PressableScale>
          </View>

          <View className="flex-row items-center justify-between mt-4">
            <TextLink
              label="Ganti alamat email"
              muted
              onPress={() => setStep(1)}
            />
            <TextLink
              label="Kirim ulang kode"
              onPress={() => {
                const next = generateNewCode();
                setOtpInput(next);
              }}
            />
          </View>
        </FadeInView>
      )}

      {/* STEP 3: USERNAME / PROFILE CREATION */}
      {step === 3 && (
        <FadeInView key="signup-step-3" index={0}>
          <FlowTitle
            eyebrow="Langkah 3 dari 4 · Profil"
            title="Buat username Anda"
            caption="Nama ini akan digunakan untuk menyapa Anda di jurnal harian dan profil Better Life."
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
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleStep3Continue}
              hint="Digunakan hanya untuk pemulihan akun."
              accessibilityLabel="Input nomor telepon opsional"
            />
          </View>
        </FadeInView>
      )}

      {/* STEP 4: PASSWORD & CONFIRMATION */}
      {step === 4 && (
        <FadeInView key="signup-step-4" index={0}>
          <FlowTitle
            eyebrow="Langkah 4 dari 4 · Keamanan"
            title="Buat kata sandi"
            caption="Gunakan minimal 6 karakter untuk melindungi data kesehatan dan target nutrisi Anda."
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
