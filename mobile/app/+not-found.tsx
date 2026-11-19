import React from "react";
import { View } from "react-native";
import { Link } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Button } from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <ScreenWrapper className="flex-1 bg-canvas items-center justify-center p-6">
      <AppText weight="bold" className="text-2xl text-ink mb-2 text-center">
        Halaman tidak ditemukan
      </AppText>
      <AppText weight="medium" className="text-sm text-muted mb-6 text-center max-w-xs">
        Tautan yang Anda buka tidak tersedia atau telah dipindahkan.
      </AppText>

      <Link href="/" asChild>
        <Button title="Kembali ke Beranda" variant="primary" />
      </Link>
    </ScreenWrapper>
  );
}
