import React, { useState } from "react";
import { View, ActivityIndicator, StyleSheet, ViewStyle, ImageStyle } from "react-native";
import { Image, ImageContentFit, ImageErrorEventData } from "expo-image";
import { useColors } from "@/hooks/use-colors";

interface OptimizedImageProps {
  uri: string;
  width?: number | string;
  height?: number | string;
  style?: ViewStyle;
  contentFit?: ImageContentFit;
  placeholder?: string; // blurhash أو base64
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: ImageErrorEventData) => void;
  cachePolicy?: "none" | "memory" | "disk" | "memory-disk";
  priority?: "low" | "normal" | "high";
}

/**
 * مكون صور محسّن مع:
 * - Lazy Loading
 * - Placeholder blur
 * - Caching
 * - معالجة الأخطاء
 */
export function OptimizedImage({
  uri,
  width = "100%",
  height = 200,
  style,
  contentFit = "cover",
  placeholder,
  onLoadStart,
  onLoadEnd,
  onError,
  cachePolicy = "memory-disk",
  priority = "normal",
}: OptimizedImageProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const containerStyle: ViewStyle = {
    width: width as any,
    height: height as any,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: "hidden",
  };

  const imageStyle: ImageStyle = {
    width: "100%",
    height: "100%",
  };

  const loadingContainerStyle: ViewStyle = {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  };

  const errorContainerStyle: ViewStyle = {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  };

  const handleLoadStart = React.useCallback(() => {
    setLoading(true);
    onLoadStart?.();
  }, [onLoadStart]);

  const handleLoadEnd = React.useCallback(() => {
    setLoading(false);
    onLoadEnd?.();
  }, [onLoadEnd]);

  const handleError = React.useCallback((event: ImageErrorEventData) => {
    setError(true);
    setLoading(false);
    onError?.(event);
  }, [onError]);

  if (error) {
    return (
      <View style={[containerStyle, style]}>
        <View style={errorContainerStyle}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.error + "20",
              justifyContent: "center",
              alignItems: "center",
            } as ViewStyle}
          >
            <View
              style={{
                width: 24,
                height: 24,
                backgroundColor: colors.error,
                borderRadius: 12,
              } as ViewStyle}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Image
        source={{ uri }}
        style={imageStyle}
        contentFit={contentFit}
        placeholder={placeholder}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        cachePolicy={cachePolicy}
        priority={priority}
        transition={200}
      />

      {loading && (
        <View style={loadingContainerStyle}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

/**
 * مكون معرض صور محسّن مع Lazy Loading
 */
interface OptimizedImageGalleryProps {
  images: string[];
  width?: number | string;
  height?: number | string;
  columns?: number;
  gap?: number;
  onImagePress?: (index: number, uri: string) => void;
  placeholders?: string[];
}

export function OptimizedImageGallery({
  images,
  width = "100%",
  height = 150,
  columns = 3,
  gap = 8,
  onImagePress,
  placeholders,
}: OptimizedImageGalleryProps) {
  const colors = useColors();

  const containerStyle: ViewStyle = {
    flexDirection: "row",
    flexWrap: "wrap",
    gap,
  };

  const imageWrapperStyle: ViewStyle = {
    flex: 1,
    minWidth: `${100 / columns}%` as any,
  };

  return (
    <View style={containerStyle}>
      {images.map((uri, index) => (
        <View key={`${uri}-${index}`} style={imageWrapperStyle}>
          <OptimizedImage
            uri={uri}
            width="100%"
            height={height}
            placeholder={placeholders?.[index]}
            priority={index < 3 ? "high" : "low"}
            onLoadStart={() => {
              // يمكن إضافة تتبع التحميل هنا
            }}
          />
        </View>
      ))}
    </View>
  );
}

/**
 * Hook للـ Image Caching
 * يدير تخزين الصور محلياً
 */
export function useImageCache() {
  const [cachedImages, setCachedImages] = React.useState<Map<string, string>>(
    new Map()
  );

  const cacheImage = React.useCallback(async (uri: string) => {
    if (cachedImages.has(uri)) {
      return cachedImages.get(uri);
    }

    try {
      // يمكن إضافة منطق تخزين الصور هنا
      // مثلاً: تحميل الصورة وحفظها محلياً
      setCachedImages((prev) => new Map(prev).set(uri, uri));
      return uri;
    } catch (error) {
      console.error("Error caching image:", error);
      return uri;
    }
  }, [cachedImages]);

  const clearCache = React.useCallback(() => {
    setCachedImages(new Map());
  }, []);

  return {
    cacheImage,
    clearCache,
    cachedImages,
  };
}

/**
 * مكون صورة مع معاينة (Preview)
 */
interface ImageWithPreviewProps extends OptimizedImageProps {
  previewUri?: string;
  showPreview?: boolean;
}

export function ImageWithPreview({
  uri,
  previewUri,
  showPreview = true,
  ...props
}: ImageWithPreviewProps) {
  const [showFullImage, setShowFullImage] = useState(!showPreview);

  return (
    <View>
      {!showFullImage && previewUri && (
        <OptimizedImage
          uri={previewUri}
          {...props}
          priority="low"
          onLoadEnd={() => setShowFullImage(true)}
        />
      )}

      {showFullImage && (
        <OptimizedImage
          uri={uri}
          {...props}
          priority="high"
        />
      )}
    </View>
  );
}
