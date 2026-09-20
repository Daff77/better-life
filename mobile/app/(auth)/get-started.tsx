import React, { useEffect } from "react";
import { View, Image, ScrollView, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Button } from "@/components/ui";
import { BrandImages } from "@/constants/Assets";
import { Shadows } from "@/constants/DesignTokens";

export default function GetStartedScreen() {
  const router = useRouter();

  // Entrance animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(16);

  const illustrationOpacity = useSharedValue(0);
  const illustrationTranslateY = useSharedValue(24);

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(32);

  const floatTranslateY = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance
    headerOpacity.value = withTiming(1, { duration: 500 });
    headerTranslateY.value = withSpring(0, { damping: 18, stiffness: 120 });

    illustrationOpacity.value = withDelay(
      150,
      withTiming(1, { duration: 550 })
    );
    illustrationTranslateY.value = withDelay(
      150,
      withSpring(0, { damping: 18, stiffness: 120 })
    );

    cardOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 550 })
    );
    cardTranslateY.value = withDelay(
      300,
      withSpring(0, { damping: 18, stiffness: 120 })
    );

    // Subtle gentle float for illustration
    floatTranslateY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const illustrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: illustrationOpacity.value,
    transform: [
      { translateY: illustrationTranslateY.value },
      { translateY: floatTranslateY.value },
    ],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const handleCreateAccount = () => {
    router.push("/(auth)/signup");
  };

  const handleSignIn = () => {
    router.push("/(auth)/login");
  };

  return (
    <ScreenWrapper maxWidth="mobile" className="flex-1 bg-white">
      {/* Decorative Ellipse in Top Right */}
      <View
        pointerEvents="none"
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-secondary-soft items-center justify-center"
        style={{ zIndex: 0 }}
      >
        <View className="w-36 h-36 rounded-full bg-primary/20" />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="px-6 py-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full my-auto py-2 items-center">
          {/* Branding and Illustration */}
          <Animated.View style={headerAnimatedStyle} className="items-center">
            <Image
              source={BrandImages.logoPng}
              style={{ width: 110, height: 110 }}
              resizeMode="contain"
              accessibilityLabel="Better Life logo"
            />
            <AppText weight="black" className="text-3xl text-primary text-center mt-2">
              Welcome!
            </AppText>
            <AppText weight="semibold" className="text-sm text-neutral-muted text-center mt-1">
              Eat better, feel healthier, live better
            </AppText>
          </Animated.View>

          <Animated.View style={illustrationAnimatedStyle} className="items-center my-6">
            <Image
              source={BrandImages.onboardingPng}
              style={{
                width: 240,
                height: 180,
              }}
              resizeMode="contain"
              accessibilityLabel="Better Life celebration illustration"
            />
          </Animated.View>

          {/* Action Card */}
          <Animated.View style={cardAnimatedStyle} className="w-full z-10">
            <View
              style={Shadows.card}
              className="bg-secondary-soft rounded-3xl p-6 border border-secondary shadow-sm"
            >
              <AppText weight="bold" className="text-2xl text-neutral-dark text-center mb-1">
                Get Started
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center mb-5">
                Join thousands tracking their nutrition effortlessly
              </AppText>

              <View className="gap-y-3">
                <Button
                  title="Create Account"
                  variant="primary"
                  onPress={handleCreateAccount}
                  accessibilityLabel="Navigate to create account"
                  className="shadow-xs"
                />

                <Button
                  title="Sign In with Email"
                  variant="social"
                  onPress={handleSignIn}
                  accessibilityLabel="Navigate to sign in"
                />
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );

}


