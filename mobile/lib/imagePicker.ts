import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export interface PickedImageResult {
  uri?: string;
  canceled?: boolean;
  error?: string;
}

const MAX_WEB_DIMENSION = 900;
const JPEG_QUALITY = 0.78;

/**
 * Checks whether an image string came from device gallery / local upload
 * rather than an HTTP/HTTPS URL.
 */
export function isLocalUploadedUri(uri: string): boolean {
  const trimmed = uri.trim();
  return (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("file:") ||
    trimmed.startsWith("content:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("ph:") ||
    trimmed.startsWith("assets-library:")
  );
}

/**
 * On Web, expo-image-picker returns ephemeral `blob:` URLs that break after refresh.
 * This resizes and converts the picked image into a compact persistent JPEG data URL.
 */
async function convertWebAssetToPersistentDataUrl(
  asset: ImagePicker.ImagePickerAsset
): Promise<string> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return asset.uri;
  }

  return new Promise((resolve) => {
    const ImgConstructor = window.Image;
    if (!ImgConstructor) {
      resolve(
        asset.base64
          ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
          : asset.uri
      );
      return;
    }

    const img = new ImgConstructor();
    img.onload = () => {
      try {
        const srcW = img.naturalWidth || img.width || MAX_WEB_DIMENSION;
        const srcH = img.naturalHeight || img.height || MAX_WEB_DIMENSION;
        const scale = Math.min(1, MAX_WEB_DIMENSION / Math.max(srcW, srcH));
        const targetW = Math.max(1, Math.round(srcW * scale));
        const targetH = Math.max(1, Math.round(srcH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(
            asset.base64
              ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
              : asset.uri
          );
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve(dataUrl);
      } catch {
        resolve(
          asset.base64
            ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
            : asset.uri
        );
      }
    };

    img.onerror = () => {
      resolve(
        asset.base64
          ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
          : asset.uri
      );
    };

    img.src = asset.uri;
  });
}

async function normalizePickedResult(
  result: ImagePicker.ImagePickerResult
): Promise<PickedImageResult> {
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { canceled: true };
  }

  const asset = result.assets[0];
  if (!asset?.uri) {
    return { error: "Foto tidak dapat dibaca. Coba pilih gambar lain." };
  }

  if (Platform.OS === "web") {
    const dataUrl = await convertWebAssetToPersistentDataUrl(asset);
    return { uri: dataUrl };
  }

  return { uri: asset.uri };
}

/**
 * Opens the device photo gallery (Android, iOS, and Web file picker).
 */
export async function pickImageFromGallery(): Promise<PickedImageResult> {
  try {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted && permission.accessPrivileges !== "limited") {
        return {
          error:
            "Izin akses galeri foto ditolak. Aktifkan izin galeri di pengaturan perangkat untuk mengunggah foto resep.",
        };
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 10],
      quality: JPEG_QUALITY,
      base64: Platform.OS === "web",
    });

    return await normalizePickedResult(result);
  } catch {
    return {
      error: "Gagal membuka galeri foto. Pastikan perangkat memiliki galeri yang aktif.",
    };
  }
}

/**
 * Opens the device camera to photograph a recipe dish.
 */
export async function takePhotoWithCamera(): Promise<PickedImageResult> {
  try {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return {
          error:
            "Izin akses kamera ditolak. Aktifkan izin kamera di pengaturan perangkat untuk memotret resep.",
        };
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 10],
      quality: JPEG_QUALITY,
      base64: Platform.OS === "web",
    });

    return await normalizePickedResult(result);
  } catch {
    return {
      error: "Gagal membuka kamera perangkat.",
    };
  }
}

