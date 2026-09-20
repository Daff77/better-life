import { create } from "zustand";
import { UIState } from "@/lib/schemas";

interface UIStoreState extends UIState {
  setSettingsModalOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  isSettingsModalOpen: false,
  activeTab: "home",
  isGlobalLoading: false,
  setSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
}));
