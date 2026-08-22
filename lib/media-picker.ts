import * as ExpoImagePicker from "expo-image-picker";

import { persistMarketingManagerFile } from "./marketing-manager-storage";

export interface ImagePickerAsset {
  uri?: string;
  type?: "image" | "video" | string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number;
  height?: number;
  duration?: number | null;
}

export interface ImagePickerResponse {
  didCancel?: boolean;
  errorCode?: string;
  errorMessage?: string;
  assets?: ImagePickerAsset[];
}

export interface ImagePickerOptions {
  mediaType?: "photo" | "video" | "mixed";
  quality?: number;
  includeBase64?: boolean;
  allowsMultipleSelection?: boolean;
}

type PickerCallback = (response: ImagePickerResponse) => void;

function getMediaTypes(mediaType: ImagePickerOptions["mediaType"]) {
  switch (mediaType) {
    case "photo": return ExpoImagePicker.MediaTypeOptions.Images;
    case "video": return ExpoImagePicker.MediaTypeOptions.Videos;
    default: return ExpoImagePicker.MediaTypeOptions.All;
  }
}

async function toResponse(result: ExpoImagePicker.ImagePickerResult): Promise<ImagePickerResponse> {
  if (result.canceled) return { didCancel: true };
  return {
    assets: await Promise.all(result.assets.map(async (asset) => ({
      uri: asset.uri ? await persistMarketingManagerFile(asset.uri, "media", asset.fileName || undefined).catch(() => asset.uri) : undefined,
      type: asset.type ?? (asset.mimeType?.startsWith("video/") ? "video" : asset.mimeType?.startsWith("image/") ? "image" : undefined),
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
    }))),
  };
}

function toExpoOptions(options: ImagePickerOptions) {
  return {
    mediaTypes: getMediaTypes(options.mediaType),
    quality: options.quality,
    base64: options.includeBase64 ?? false,
    allowsMultipleSelection: options.allowsMultipleSelection ?? false,
  };
}

/** منتقي متوافق يحفظ كل وسيط مختار في موقع marketing manager إن كان المستخدم قد اختاره. */
export async function launchImageLibrary(options: ImagePickerOptions, callback: PickerCallback): Promise<void> {
  try {
    const result = await ExpoImagePicker.launchImageLibraryAsync(toExpoOptions(options));
    callback(await toResponse(result));
  } catch (error) {
    callback({ errorCode: "picker_error", errorMessage: error instanceof Error ? error.message : "Image picker failed" });
  }
}

/** يفتح الكاميرا بعد طلب إذنها ثم يحفظ الوسيط الناتج في موقع marketing manager عند توفره. */
export async function launchCamera(options: ImagePickerOptions, callback: PickerCallback): Promise<void> {
  try {
    const permission = await ExpoImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { callback({ errorCode: "permission_denied" }); return; }
    const result = await ExpoImagePicker.launchCameraAsync(toExpoOptions(options));
    callback(await toResponse(result));
  } catch (error) {
    callback({ errorCode: "picker_error", errorMessage: error instanceof Error ? error.message : "Camera launch failed" });
  }
}
