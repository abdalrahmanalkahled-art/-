import * as ExpoImagePicker from "expo-image-picker";

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
    case "photo":
      return ExpoImagePicker.MediaTypeOptions.Images;
    case "video":
      return ExpoImagePicker.MediaTypeOptions.Videos;
    default:
      return ExpoImagePicker.MediaTypeOptions.All;
  }
}

function toResponse(result: ExpoImagePicker.ImagePickerResult): ImagePickerResponse {
  if (result.canceled) {
    return { didCancel: true };
  }

  return {
    assets: result.assets.map((asset) => ({
      uri: asset.uri,
      type:
        asset.type ??
        (asset.mimeType?.startsWith("video/")
          ? "video"
          : asset.mimeType?.startsWith("image/")
            ? "image"
            : undefined),
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
    })),
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

/**
 * Compatibility wrapper for the app's image flows. It keeps the existing
 * callback response shape while using Expo's managed native module.
 */
export async function launchImageLibrary(
  options: ImagePickerOptions,
  callback: PickerCallback,
): Promise<void> {
  try {
    const result = await ExpoImagePicker.launchImageLibraryAsync(toExpoOptions(options));
    callback(toResponse(result));
  } catch (error) {
    callback({
      errorCode: "picker_error",
      errorMessage: error instanceof Error ? error.message : "Image picker failed",
    });
  }
}

/**
 * Opens the camera only after Android/iOS camera permission has been granted.
 */
export async function launchCamera(
  options: ImagePickerOptions,
  callback: PickerCallback,
): Promise<void> {
  try {
    const permission = await ExpoImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      callback({ errorCode: "permission_denied" });
      return;
    }

    const result = await ExpoImagePicker.launchCameraAsync(toExpoOptions(options));
    callback(toResponse(result));
  } catch (error) {
    callback({
      errorCode: "picker_error",
      errorMessage: error instanceof Error ? error.message : "Camera launch failed",
    });
  }
}
