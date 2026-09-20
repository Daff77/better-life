import React from "react";
import { View, Image, ImageSourcePropType } from "react-native";
import { AppText } from "./AppText";

export interface AvatarProps {
  name: string;
  imageSource?: ImageSourcePropType;
  size?: number | "sm" | "md" | "lg";
  showBadge?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  imageSource,
  size = "md",
  showBadge = false,
}) => {
  const pixelSize = typeof size === "number" ? size : size === "sm" ? 44 : size === "lg" ? 80 : 60;
  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : "U";

  return (
    <View style={{ width: pixelSize, height: pixelSize }} className="relative items-center justify-center">
      {imageSource ? (
        <Image
          source={imageSource}
          style={{ width: pixelSize, height: pixelSize, borderRadius: pixelSize / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{ width: pixelSize, height: pixelSize, borderRadius: pixelSize / 2 }}
          className="bg-primary/20 border-2 border-primary items-center justify-center"
        >
          <AppText weight="black" className="text-primary text-xl">
            {initial}
          </AppText>
        </View>
      )}

      {showBadge && (
        <View className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-white items-center justify-center" />
      )}
    </View>
  );
};
