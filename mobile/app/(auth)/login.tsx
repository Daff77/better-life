import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Button, Input, Header, Divider, GoogleSignInModal } from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { DEFAULT_DEMO_ACCOUNT } from "@/lib/sessionStorage";
import { IconRenderer } from "@/constants/Assets";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Validation
  const validateForm = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");
    setGeneralError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Email address is required.");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email format.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError("");

    try {
      const result = await login(email.trim(), password);
      setIsLoading(false);

      if (!result.success) {
        setGeneralError(result.error || "Invalid email or password.");
        return;
      }

      // Check onboarding state from current auth store
      const onboardingCompleted = useAuthStore.getState().onboardingCompleted;
      if (!onboardingCompleted) {
        router.replace("/(onboarding)");
      } else {
        router.replace("/(app)/(tabs)");
      }
    } catch (err) {
      setIsLoading(false);
      setGeneralError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <ScreenWrapper maxWidth="narrow" className="flex-1 bg-white">
      <Header
        onBack={() => router.back()}
        title=""
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-2 pb-10"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full my-auto md:bg-white md:p-8 md:rounded-3xl md:border md:border-[#e5ece7] md:shadow-md">
            {/* Header Typography */}
            <View className="mb-8">
              <AppText weight="bold" className="text-3xl text-primary mb-1">
                Welcome!
              </AppText>
              <AppText weight="semibold" className="text-base text-neutral-muted">
                Login to your Account
              </AppText>
            </View>

            {/* General Form Error Alert */}
            {!!generalError && (
              <View className="mb-4 p-3.5 bg-status-error/10 border border-status-error/20 rounded-xl">
                <AppText weight="semibold" className="text-sm text-status-error">
                  {generalError}
                </AppText>
              </View>
            )}

            {/* Input Fields */}
            <View className="gap-y-4 mb-3">
              <Input
                label="EMAIL ADDRESS"
                placeholder="e.g. yourname@gmail.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError("");
                  if (generalError) setGeneralError("");
                }}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                accessibilityLabel="Email address input"
              />

              <Input
                label="PASSWORD"
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                  if (generalError) setGeneralError("");
                }}
                error={passwordError}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                accessibilityLabel="Password input"
              />
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              className="self-end mb-6 py-1"
              onPress={() =>
                Alert.alert(
                  "Reset Password",
                  "For this local MVP, use password: 'password123' for the demo account or the password you entered during Sign Up."
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
            >
              <AppText weight="semibold" className="text-sm text-primary">
                Forgot Password?
              </AppText>
            </TouchableOpacity>

            {/* Submit Action */}
            <Button
              title="Login"
              variant="primary"
              loading={isLoading}
              onPress={handleLogin}
              accessibilityLabel="Submit login"
              className="mb-2"
            />

            {/* Social Divider */}
            <Divider label="OR" className="my-2" />

            {/* Google Sign In Button */}
            <TouchableOpacity
              onPress={() => setShowGoogleModal(true)}
              className="w-full min-h-[48px] flex-row items-center justify-center py-3 px-4 rounded-full border border-[#e5ece7] bg-white active:bg-[#f2f8f4] shadow-2xs mb-4 gap-x-3 active:scale-[0.96]"
              accessibilityRole="button"
              accessibilityLabel="Login with Google"
            >
              <IconRenderer name="Google" size={20} />
              <AppText weight="bold" className="text-base text-neutral-dark">
                Login with Google
              </AppText>
            </TouchableOpacity>

            {/* Development-Only Demo Autofill Helper */}
            {__DEV__ && (
              <TouchableOpacity
                onPress={() => {
                  setEmail(DEFAULT_DEMO_ACCOUNT.email);
                  setPassword(DEFAULT_DEMO_ACCOUNT.password);
                  setEmailError("");
                  setPasswordError("");
                  setGeneralError("");
                }}
                className="self-center py-2.5 px-5 mb-4 bg-[#f2f8f4] rounded-full border border-[#cbe5d6] items-center justify-center min-h-[44px] active:scale-[0.96]"
                accessibilityRole="button"
                accessibilityLabel="Fill demo account"
              >
                <AppText weight="bold" className="text-xs text-primary text-center">
                  Fill Demo Account
                </AppText>
              </TouchableOpacity>
            )}

            {/* Footer Navigation */}
            <View className="flex-row justify-center items-center pt-2">
              <AppText weight="semibold" className="text-sm text-neutral-muted">
                Don't have an account?{" "}
              </AppText>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/signup")}
                accessibilityRole="link"
                accessibilityLabel="Go to register page"
              >
                <AppText weight="extrabold" className="text-sm text-primary">
                  Register Now
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Sign In Modal */}
      <GoogleSignInModal
        visible={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
      />
    </ScreenWrapper>
  );
}
