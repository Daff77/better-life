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
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-white">
      {/* Decorative Ellipse in Top Right */}
      <View
        pointerEvents="none"
        className="absolute -top-16 -right-16 w-56 h-56 md:w-80 md:h-80 rounded-full bg-secondary-soft items-center justify-center"
        style={{ zIndex: 0 }}
      >
        <View className="w-36 h-36 md:w-56 md:h-56 rounded-full bg-primary/20" />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="px-6 py-6 md:px-12 lg:px-20"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full flex-col md:flex-row md:items-center md:justify-between md:gap-x-12 lg:gap-x-20 my-auto py-2">
          
          {/* Left Column: Branding and Illustration */}
          <View className="w-full md:flex-1 items-center md:items-start z-10">
            <Animated.View style={headerAnimatedStyle} className="items-center md:items-start">
              <Image
                source={BrandImages.logoPng}
                style={{ width: 130, height: 130 }}
                resizeMode="contain"
                accessibilityLabel="Better Life logo"
              />
              <AppText weight="bold" className="text-3xl md:text-5xl lg:text-6xl text-primary text-center md:text-left mt-2">
                Welcome!
              </AppText>
              <AppText weight="semibold" className="text-base md:text-xl text-neutral-muted text-center md:text-left mt-1.5 md:mt-3">
                Eat better, feel healthier, live better
              </AppText>
            </Animated.View>

            <Animated.View style={illustrationAnimatedStyle} className="items-center md:items-start my-6 md:my-10">
              <Image
                source={BrandImages.onboardingPng}
                style={{
                  width: 260,
                  height: 195,
                  ...(Platform.OS === 'web' ? { maxWidth: '100%', height: 'auto', aspectRatio: '4/3', maxHeight: 340 } : {})
                }}
                resizeMode="contain"
                accessibilityLabel="Better Life health celebration illustration"
              />
            </Animated.View>
          </View>

          {/* Right Column: Action Panel Drawer / Card */}
          <Animated.View style={cardAnimatedStyle} className="w-full md:w-[380px] lg:w-[440px] z-10">
            <View
              style={Platform.OS === "web" ? Shadows.elevated : Shadows.card}
              className="bg-secondary md:bg-white rounded-3xl p-6 md:p-8 lg:p-10 border border-neutral-border-light shadow-sm md:shadow-xl"
            >
              <AppText weight="bold" className="text-2xl md:text-3xl text-neutral-dark text-center md:text-left mb-1.5 md:mb-2">
                Get Started
              </AppText>
              <AppText weight="medium" className="text-sm md:text-base text-neutral-muted text-center md:text-left mb-6 md:mb-8">
                Join thousands tracking their nutrition effortlessly
              </AppText>

              <View className="gap-y-3.5">
                <Button
                  title="Create Account"
                  variant="primary"
                  onPress={handleCreateAccount}
                  accessibilityLabel="Navigate to create account"
                  className="shadow-sm"
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


