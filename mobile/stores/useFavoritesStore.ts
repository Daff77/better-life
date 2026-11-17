import { create } from "zustand";
import { accountRevision, accountStorageKey } from "@/lib/accountScope";
import { getStorageItem, setStorageItem } from "@/lib/journalStorage";
import { sessionStorage } from "@/lib/sessionStorage";
import { API_BASE_URL } from "@/lib/api/config";
import { notifyUnauthorizedSession } from "@/lib/authToken";
import { FoodItem } from "@/data/mockRecipes";

export interface FavoriteFoodItem {
  itemId: string;
  title: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink";
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  estimatedCostIdr?: number;
  imageUrl?: string | null;
  savedAt: string;
}

const FAVORITES_STORAGE_PREFIX = "betterlife_favorites_v1";

function normalizeCategory(raw: string): FavoriteFoodItem["category"] {
  if (raw === "Breakfast" || raw === "Lunch" || raw === "Dinner" || raw === "Snack" || raw === "Drink") {
    return raw;
  }
  return "Snack";
}

function dedupeFavorites(items: FavoriteFoodItem[]): FavoriteFoodItem[] {
  const byId = new Map<string, FavoriteFoodItem>();
  for (const item of items) {
    if (!item || typeof item.itemId !== "string" || !item.itemId.trim()) continue;
    const clean: FavoriteFoodItem = {
      itemId: item.itemId.trim(),
      title: String(item.title || "Menu Favorit").trim(),
      category: normalizeCategory(item.category),
      calories: Math.max(0, Number(item.calories) || 0),
      proteinGrams: Math.max(0, Number(item.proteinGrams) || 0),
      carbsGrams: Math.max(0, Number(item.carbsGrams) || 0),
      fatGrams: Math.max(0, Number(item.fatGrams) || 0),
      fiberGrams: Math.max(0, Number(item.fiberGrams) || 0),
      estimatedCostIdr:
        item.estimatedCostIdr !== undefined ? Math.max(0, Number(item.estimatedCostIdr) || 0) : undefined,
      imageUrl: item.imageUrl ?? undefined,
      savedAt: typeof item.savedAt === "string" ? item.savedAt : new Date().toISOString(),
    };
    const existing = byId.get(clean.itemId);
    if (!existing || Date.parse(clean.savedAt) >= Date.parse(existing.savedAt)) {
      byId.set(clean.itemId, clean);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)
  );
}

async function readFavoritesStorage(): Promise<FavoriteFoodItem[]> {
  const key = accountStorageKey(FAVORITES_STORAGE_PREFIX);
  try {
    const raw = await getStorageItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? dedupeFavorites(parsed) : [];
  } catch {
    return [];
  }
}

async function writeFavoritesStorage(items: FavoriteFoodItem[]): Promise<void> {
  const key = accountStorageKey(FAVORITES_STORAGE_PREFIX);
  const raw = JSON.stringify(items);
  try {
    await setStorageItem(key, raw);
  } catch {
    // Non-fatal storage error
  }
}

export function favoriteToFoodItem(fav: FavoriteFoodItem): FoodItem {
  return {
    id: fav.itemId,
    title: fav.title,
    category: fav.category,
    calories: fav.calories,
    prepTimeMinutes: 10,
    difficulty: "Easy",
    description: `Menu favorit · P ${Math.round(fav.proteinGrams)}g · K ${Math.round(fav.carbsGrams)}g · L ${Math.round(fav.fatGrams)}g`,
    svgIcon:
      fav.category === "Drink"
        ? "Drinks"
        : fav.category === "Snack"
        ? "Snacks"
        : fav.category,
    estimatedCostIdr: fav.estimatedCostIdr,
    imageUrl: fav.imageUrl ?? undefined,
    nutrition: {
      proteinGrams: fav.proteinGrams,
      carbsGrams: fav.carbsGrams,
      fatGrams: fav.fatGrams,
      fiberGrams: fav.fiberGrams,
    },
    ingredients: [],
    instructions: [],
  };
}

interface FavoritesState {
  favorites: FavoriteFoodItem[];
  isHydrated: boolean;

  hydrateForAccount: () => Promise<void>;
  resetForLogout: () => void;
  isFavorite: (itemId: string) => boolean;
  toggleFavorite: (meal: FoodItem | FavoriteFoodItem) => Promise<boolean>;
  mergeFromBackup: (incoming: Array<Partial<FavoriteFoodItem>>, syncRemote?: boolean) => Promise<number>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  isHydrated: false,

  hydrateForAccount: async () => {
    const rev = accountRevision();
    const local = await readFavoritesStorage();
    if (rev !== accountRevision()) return;

    let merged = local;

    try {
      const session = await sessionStorage.getSession();
      if (session?.token && rev === accountRevision()) {
        const res = await fetch(`${API_BASE_URL}/profile/favorites`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (res.status === 401 && rev === accountRevision()) {
          await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
          return;
        }
        if (res.ok && rev === accountRevision()) {
          const payload = await res.json();
          if (Array.isArray(payload?.favorites)) {
            const remoteMapped: FavoriteFoodItem[] = payload.favorites.map((r: any) => ({
              itemId: r.itemId,
              title: r.title,
              category: normalizeCategory(r.category),
              calories: r.calories,
              proteinGrams: r.proteinGrams ?? 0,
              carbsGrams: r.carbsGrams ?? 0,
              fatGrams: r.fatGrams ?? 0,
              fiberGrams: r.fiberGrams ?? 0,
              estimatedCostIdr: r.estimatedCostIdr ?? undefined,
              imageUrl: r.imageUrl ?? undefined,
              savedAt: r.createdAt ?? new Date().toISOString(),
            }));
            merged = dedupeFavorites([...local, ...remoteMapped]);
            await writeFavoritesStorage(merged);
          }
        }
      }
    } catch {
      // Offline fallback uses local account-scoped favorites
    }

    if (rev !== accountRevision()) return;
    set({ favorites: merged, isHydrated: true });
  },

  resetForLogout: () => {
    set({ favorites: [], isHydrated: false });
  },

  isFavorite: (itemId: string) => {
    return get().favorites.some((f) => f.itemId === itemId);
  },

  toggleFavorite: async (input) => {
    const rev = accountRevision();
    const itemId = "itemId" in input ? input.itemId : input.id;
    const currentlyFav = get().favorites.some((f) => f.itemId === itemId);

    if (currentlyFav) {
      const next = get().favorites.filter((f) => f.itemId !== itemId);
      set({ favorites: next });
      await writeFavoritesStorage(next);

      try {
        const session = await sessionStorage.getSession();
        if (session?.token && rev === accountRevision()) {
          const res = await fetch(
            `${API_BASE_URL}/profile/favorites/${encodeURIComponent(itemId)}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${session.token}` },
            }
          );
          if (res.status === 401 && rev === accountRevision()) {
            await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
          }
        }
      } catch {
        // Offline safe
      }
      return false;
    }

    const newItem: FavoriteFoodItem =
      "itemId" in input
        ? {
            ...input,
            savedAt: new Date().toISOString(),
          }
        : {
            itemId: input.id,
            title: input.title,
            category: normalizeCategory(input.category),
            calories: input.calories,
            proteinGrams: input.nutrition?.proteinGrams ?? 0,
            carbsGrams: input.nutrition?.carbsGrams ?? 0,
            fatGrams: input.nutrition?.fatGrams ?? 0,
            fiberGrams: input.nutrition?.fiberGrams ?? 0,
            estimatedCostIdr: input.estimatedCostIdr,
            imageUrl: input.imageUrl,
            savedAt: new Date().toISOString(),
          };

    const next = dedupeFavorites([newItem, ...get().favorites]);
    set({ favorites: next });
    await writeFavoritesStorage(next);

    try {
      const session = await sessionStorage.getSession();
      if (session?.token && rev === accountRevision()) {
        const res = await fetch(`${API_BASE_URL}/profile/favorites`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemId: newItem.itemId,
            title: newItem.title,
            category: newItem.category,
            calories: newItem.calories,
            proteinGrams: newItem.proteinGrams,
            carbsGrams: newItem.carbsGrams,
            fatGrams: newItem.fatGrams,
            fiberGrams: newItem.fiberGrams,
            estimatedCostIdr: newItem.estimatedCostIdr ?? 0,
            imageUrl: newItem.imageUrl ?? null,
          }),
        });
        if (res.status === 401 && rev === accountRevision()) {
          await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
        }
      }
    } catch {
      // Offline safe
    }

    return true;
  },

  mergeFromBackup: async (incoming, syncRemote = true) => {
    const rev = accountRevision();
    const mapped: FavoriteFoodItem[] = incoming
      .filter((i): i is Partial<FavoriteFoodItem> & { itemId: string; title: string } =>
        Boolean(i && typeof i.itemId === "string" && typeof i.title === "string")
      )
      .map((i) => ({
        itemId: i.itemId,
        title: i.title,
        category: normalizeCategory(String(i.category || "Snack")),
        calories: Math.max(0, Number(i.calories) || 0),
        proteinGrams: Math.max(0, Number(i.proteinGrams) || 0),
        carbsGrams: Math.max(0, Number(i.carbsGrams) || 0),
        fatGrams: Math.max(0, Number(i.fatGrams) || 0),
        fiberGrams: Math.max(0, Number(i.fiberGrams) || 0),
        estimatedCostIdr:
          i.estimatedCostIdr !== undefined ? Math.max(0, Number(i.estimatedCostIdr) || 0) : undefined,
        imageUrl: i.imageUrl ?? undefined,
        savedAt: typeof i.savedAt === "string" ? i.savedAt : new Date().toISOString(),
      }));

    const existingIds = new Set(get().favorites.map((f) => f.itemId));
    const newlyAddedCount = mapped.filter((m) => !existingIds.has(m.itemId)).length;
    const merged = dedupeFavorites([...get().favorites, ...mapped]);

    set({ favorites: merged, isHydrated: true });
    await writeFavoritesStorage(merged);

    if (syncRemote && rev === accountRevision()) {
      try {
        const session = await sessionStorage.getSession();
        if (session?.token) {
          for (const fav of mapped) {
            await fetch(`${API_BASE_URL}/profile/favorites`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                itemId: fav.itemId,
                title: fav.title,
                category: fav.category,
                calories: fav.calories,
                proteinGrams: fav.proteinGrams,
                carbsGrams: fav.carbsGrams,
                fatGrams: fav.fatGrams,
                fiberGrams: fav.fiberGrams,
                estimatedCostIdr: fav.estimatedCostIdr ?? 0,
                imageUrl: fav.imageUrl ?? null,
              }),
            });
          }
        }
      } catch {
        // Offline safe
      }
    }

    return newlyAddedCount;
  },
}));
