import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Button, Input, Header, Divider, GoogleSignInModal } from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { IconRenderer } from "@/constants/Assets";

export default function SignupScreen() {
  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validation errors
  const [fullNameError, setFullNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const validateForm = () => {
    let isValid = true;
    setFullNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setGeneralError("");

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setFullNameError("Full name must have at least 2 characters.");
      isValid = false;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Email address is required.");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Please provide a valid email format.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmError("Please confirm your password.");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      isValid = false;
    }

    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError("");

    try {
      const result = await signup({
        name: fullName.trim(),
        email: email.trim(),
        password,
      });

      setIsLoading(false);

      if (!result.success) {
        setGeneralError(result.error || "Failed to create account.");
        return;
      }

      // Account created with onboardingCompleted = false -> navigate to onboarding
      router.replace("/(onboarding)");
    } catch (err) {
      setIsLoading(false);
      setGeneralError("An unexpected error occurred during registration.");
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
          className="flex-1 px-6 pt-2 pb-8"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full my-auto md:bg-white md:p-8 md:rounded-3xl md:border md:border-[#e5ece7] md:shadow-md">
            {/* Header Typography */}
            <View className="mb-6">
              <AppText weight="bold" className="text-3xl text-neutral-dark mb-1">
                Create Account
              </AppText>
              <AppText weight="medium" className="text-sm text-neutral-muted">
                Sign up to start your personalized nutrition journey.
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

            {/* Form Fields */}
            <View className="gap-y-4 mb-6">
              <Input
                label="FULL NAME"
                placeholder="e.g. Jane Doe"
                value={fullName}
                onChangeText={(val) => {
                  setFullName(val);
                  if (fullNameError) setFullNameError("");
                  if (generalError) setGeneralError("");
                }}
                error={fullNameError}
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel="Full name input"
              />

              <Input
                label="EMAIL ADDRESS"
                placeholder="name@example.com"
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
                returnKeyType="next"
                accessibilityLabel="Email address input"
              />

              <Input
                label="PASSWORD"
                placeholder="Min. 6 characters"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (passwordError) setPasswordError("");
                  if (generalError) setGeneralError("");
                }}
                error={passwordError}
                secureTextEntry
                returnKeyType="next"
                accessibilityLabel="Create password input"
              />

              <Input
                label="CONFIRM PASSWORD"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  if (confirmError) setConfirmError("");
                  if (generalError) setGeneralError("");
                }}
                error={confirmError}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                accessibilityLabel="Confirm password input"
              />
            </View>

            {/* Action button at bottom */}
            <View className="pt-2 pb-2">
              <Button
                title="Create Account"
                variant="primary"
                loading={isLoading}
                onPress={handleSignup}
                accessibilityLabel="Submit account registration"
                className="mb-2"
              />

              {/* Social Divider */}
              <Divider label="OR" className="my-2" />

              {/* Google Sign In Button */}
              <TouchableOpacity
                onPress={() => setShowGoogleModal(true)}
                className="w-full min-h-[48px] flex-row items-center justify-center py-3 px-4 rounded-full border border-[#e5ece7] bg-white active:bg-[#f2f8f4] shadow-2xs mb-4 gap-x-3 active:scale-[0.96]"
                accessibilityRole="button"
                accessibilityLabel="Register with Google"
              >
                <IconRenderer name="Google" size={20} />
                <AppText weight="bold" className="text-base text-neutral-dark">
                  Register with Google
                </AppText>
              </TouchableOpacity>

              <View className="flex-row justify-center items-center">
                <AppText weight="semibold" className="text-sm text-neutral-muted">
                  Already have an account?{" "}
                </AppText>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                  accessibilityRole="link"
                  accessibilityLabel="Navigate to login"
                >
                  <AppText weight="extrabold" className="text-sm text-primary">
                    Login
                  </AppText>
                </TouchableOpacity>
              </View>
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
