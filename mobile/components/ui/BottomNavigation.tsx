import React from "react";
import { View, TouchableOpacity } from "react-native";
import { AppText } from "./AppText";
import { Colors } from "@/constants/DesignTokens";

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export interface BottomNavigationProps {
  items: TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items,
  activeKey,
  onSelect,
}) => {
  return (
    <View className="w-full bg-white border-t border-neutral-border-light h-[68px] flex-row items-center justify-around px-2 shadow-sm">
      {items.map((item) => {
        const isActive = item.key === activeKey;

        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onSelect(item.key)}
            activeOpacity={0.7}
            className="flex-1 min-h-[44px] items-center justify-center py-1"
          >
            {isActive ? (
              <View className="flex-row items-center bg-primary-subtle border border-primary px-3 py-1.5 rounded-full gap-x-1.5">
                {item.icon}
                <AppText weight="extrabold" className="text-sm text-primary">
                  {item.label}
                </AppText>
              </View>
            ) : (
              <View className="items-center justify-center p-1 opacity-60">
                {item.icon}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
