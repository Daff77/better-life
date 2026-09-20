import React from "react";
import { View } from "react-native";
import { Link } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Button } from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <ScreenWrapper className="flex-1 bg-white items-center justify-center p-6">
      <AppText weight="black" className="text-3xl text-neutral-dark mb-2 text-center">
        This screen doesn't exist.
      </AppText>
      <AppText weight="medium" className="text-sm text-neutral-muted mb-6 text-center">
        The link you followed may be broken or the route doesn't exist.
      </AppText>

      <Link href="/" asChild>
        <Button title="Go to Home Screen" variant="primary" />
      </Link>
    </ScreenWrapper>
  );
}
