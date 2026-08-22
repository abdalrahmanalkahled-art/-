import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as VideoThumbnails from "expo-video-thumbnails";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";
import { openEventMediaExternally, shareEventMedia, type EventMediaType } from "@/lib/event-video-storage";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface MediaItem {
  uri: string;
  type: EventMediaType;
}

interface MediaGalleryLightboxProps {
  mediaItems: MediaItem[];
  onDeleteMedia: (uri: string) => void;
  onAddMedia: (uri: string, type: EventMediaType, metadata?: { fileName?: string | null; mimeType?: string | null }) => void;
}

export function MediaGalleryLightbox({ mediaItems, onDeleteMedia, onAddMedia }: MediaGalleryLightboxProps) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [mediaPendingDelete, setMediaPendingDelete] = useState<string | null>(null);

  const handleDeleteMedia = useCallback((uri: string) => setMediaPendingDelete(uri), []);

  const handleOpenExternal = useCallback(async (item: MediaItem) => {
    try {
      await openEventMediaExternally(item.uri, item.type);
    } catch (error) {
      Alert.alert("تعذر فتح الملف", error instanceof Error ? error.message : "تأكد من أن الملف محفوظ بصورة صحيحة ثم حاول مجدداً.");
    }
  }, []);

  const handleShare = useCallback(async (item: MediaItem) => {
    try {
      await shareEventMedia(item.uri, item.type);
    } catch (error) {
      Alert.alert("تعذرت المشاركة", error instanceof Error ? error.message : "تعذر فتح خيارات المشاركة لهذا الملف.");
    }
  }, []);

  const handleSelect = useCallback((item: MediaItem, index: number) => {
    if (item.type === "video") {
      void handleOpenExternal(item);
      return;
    }
    setSelectedIndex(index);
  }, [handleOpenExternal]);

  const renderMediaThumbnail = useCallback(({ item, index }: { item: MediaItem; index: number }) => (
    <View style={styles.thumbnailContainer}>
      <TouchableOpacity onPress={() => handleSelect(item, index)} style={styles.thumbnailPressable} activeOpacity={0.8}>
        {item.type === "image" ? (
          <Image source={{ uri: item.uri }} style={styles.thumbnail} onError={() => Alert.alert("خطأ", "فشل تحميل الصورة")} />
        ) : <VideoThumbnail uri={item.uri} />}
        <View style={[styles.typeIndicator, { backgroundColor: colors.primary }]}>
          <MaterialIcons name={item.type === "image" ? "image" : "play-arrow"} size={14} color="#fff" />
        </View>
      </TouchableOpacity>
      <TouchableOpacity accessibilityLabel="مشاركة التوثيق" onPress={() => void handleShare(item)} style={[styles.shareBadge, { backgroundColor: colors.surface }]}> 
        <MaterialIcons name="share" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  ), [colors.primary, colors.surface, handleSelect, handleShare]);

  const selectedItem = selectedIndex === null ? null : mediaItems[selectedIndex] || null;

  return (
    <View style={styles.container}>
      <View style={styles.galleryHeader}>
        <TouchableOpacity onPress={() => setShowMediaPicker(true)} style={[styles.addButtonIconOnly, { backgroundColor: colors.primary }]} activeOpacity={0.7} accessibilityLabel="إضافة توثيق">
          <MaterialIcons name="add" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.galleryTitle, { color: colors.foreground }]}>{mediaItems.length ? `${mediaItems.length} وسيط` : "التوثيق والوسائط"}</Text>
      </View>

      <Modal visible={showMediaPicker} transparent animationType="fade" onRequestClose={() => setShowMediaPicker(false)}>
        <View style={styles.mediaPickerBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowMediaPicker(false)} accessibilityLabel="إغلاق خيارات التوثيق" />
          <View style={[styles.mediaPickerSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.mediaPickerHead}>
              <TouchableOpacity onPress={() => setShowMediaPicker(false)} style={[styles.closePickerButton, { backgroundColor: colors.background }]} accessibilityLabel="إغلاق خيارات التوثيق"><MaterialIcons name="close" size={20} color={colors.muted} /></TouchableOpacity>
              <View style={styles.mediaPickerCopy}><Text style={[styles.mediaPickerTitle, { color: colors.foreground }]}>إضافة توثيق</Text><Text style={[styles.mediaPickerSubtitle, { color: colors.muted }]}>اختر نوع الوسيط الذي تريد إضافته للفعالية</Text></View>
              <View style={[styles.mediaPickerIcon, { backgroundColor: colors.primary + "18" }]}><MaterialIcons name="perm-media" size={22} color={colors.primary} /></View>
            </View>
            <View style={styles.mediaPickerOptions}>
              <MediaTypeButton label="إضافة صورة" description="من معرض الصور" icon="image" onPress={() => { onAddMedia("", "image"); setShowMediaPicker(false); }} colors={colors} />
              <MediaTypeButton label="إضافة فيديو" description="من ملفات الفيديو" icon="videocam" onPress={() => { onAddMedia("", "video"); setShowMediaPicker(false); }} colors={colors} />
            </View>
          </View>
        </View>
      </Modal>

      {mediaItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="perm-media" size={46} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>أضف صورة أو فيديو لتوثيق الفعالية</Text>
        </View>
      ) : (
        <FlatList data={mediaItems} keyExtractor={(item, index) => `${item.uri}-${index}`} numColumns={3} scrollEnabled={false} renderItem={renderMediaThumbnail} contentContainerStyle={styles.galleryGrid} />
      )}

      <Modal visible={selectedItem !== null} transparent animationType="fade" onRequestClose={() => setSelectedIndex(null)}>
        <View style={styles.lightboxContainer}>
          <View style={styles.lightboxHeader}>
            <TouchableOpacity onPress={() => setSelectedIndex(null)}><MaterialIcons name="close" size={28} color="#fff" /></TouchableOpacity>
            <Text style={styles.lightboxCounter}>{selectedIndex === null ? "" : `${selectedIndex + 1} / ${mediaItems.length}`}</Text>
            <View style={styles.headerActions}>
              {selectedItem ? <TouchableOpacity onPress={() => void handleShare(selectedItem)}><MaterialIcons name="share" size={23} color="#fff" /></TouchableOpacity> : null}
              {selectedItem ? <TouchableOpacity onPress={() => handleDeleteMedia(selectedItem.uri)}><MaterialIcons name="delete" size={24} color="#EF4444" /></TouchableOpacity> : null}
            </View>
          </View>

          {selectedItem?.type === "image" ? (
            <View style={styles.lightboxContent}>
              <Image source={{ uri: selectedItem.uri }} style={styles.lightboxImage} resizeMode="contain" onLoadStart={() => setLoadingIndex(selectedIndex)} onLoadEnd={() => setLoadingIndex(null)} onError={() => { Alert.alert("خطأ", "فشل تحميل الصورة"); setLoadingIndex(null); }} />
              {loadingIndex === selectedIndex ? <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={colors.primary} /></View> : null}
            </View>
          ) : null}

          <View style={styles.lightboxFooter}>
            <TouchableOpacity onPress={() => selectedIndex !== null && selectedIndex > 0 && handleSelect(mediaItems[selectedIndex - 1], selectedIndex - 1)} disabled={selectedIndex === 0} style={[styles.navigationButton, selectedIndex === 0 && styles.navigationButtonDisabled]}>
              <MaterialIcons name="chevron-right" size={28} color={selectedIndex === 0 ? "#666" : "#fff"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => selectedIndex !== null && selectedIndex < mediaItems.length - 1 && handleSelect(mediaItems[selectedIndex + 1], selectedIndex + 1)} disabled={selectedIndex === mediaItems.length - 1} style={[styles.navigationButton, selectedIndex === mediaItems.length - 1 && styles.navigationButtonDisabled]}>
              <MaterialIcons name="chevron-left" size={28} color={selectedIndex === mediaItems.length - 1 ? "#666" : "#fff"} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ConfirmDialog
        visible={Boolean(mediaPendingDelete)}
        title="حذف الملف"
        message="هل أنت متأكد من حذف هذا الملف من توثيق الفعالية؟ لا يمكن التراجع عن ذلك."
        confirmText="حذف الملف"
        isDangerous
        icon="warning"
        onCancel={() => setMediaPendingDelete(null)}
        onConfirm={() => { if (mediaPendingDelete) onDeleteMedia(mediaPendingDelete); setMediaPendingDelete(null); setSelectedIndex(null); }}
      />
    </View>
  );
}

function MediaTypeButton({ label, description, icon, onPress, colors }: { label: string; description: string; icon: "image" | "videocam"; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <TouchableOpacity onPress={onPress} style={[styles.mediaOption, { borderColor: colors.border, backgroundColor: colors.background }]} activeOpacity={0.7}><View style={[styles.mediaOptionIcon, { backgroundColor: colors.primary + "16" }]}><MaterialIcons name={icon} size={25} color={colors.primary} /></View><Text style={[styles.mediaOptionText, { color: colors.foreground }]}>{label}</Text><Text style={[styles.mediaOptionDescription, { color: colors.muted }]}>{description}</Text></TouchableOpacity>;
}

function VideoThumbnail({ uri }: { uri: string }) {
  const colors = useColors();
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setThumbnailUri(null);
    setFailed(false);
    void VideoThumbnails.getThumbnailAsync(uri, { time: 700, quality: 0.6 })
      .then((result) => active && setThumbnailUri(result.uri))
      .catch(() => active && setFailed(true));
    return () => { active = false; };
  }, [uri]);

  if (thumbnailUri) return <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />;
  return <View style={[styles.thumbnail, { backgroundColor: colors.surface }]}>{failed ? <MaterialIcons name="videocam-off" size={30} color={colors.muted} /> : <ActivityIndicator color={colors.primary} />}</View>;
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  galleryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  galleryTitle: { fontSize: 14, fontWeight: "700" },
  addButtonIconOnly: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  mediaPickerBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.42)", justifyContent: "center", padding: 24 },
  mediaPickerSheet: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 22, elevation: 10 },
  mediaPickerHead: { flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  mediaPickerIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  mediaPickerCopy: { flex: 1, alignItems: "flex-end" },
  mediaPickerTitle: { fontSize: 17, fontWeight: "800", textAlign: "right" },
  mediaPickerSubtitle: { fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 3 },
  closePickerButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  mediaPickerOptions: { flexDirection: "row-reverse", gap: 10 },
  mediaOption: { flex: 1, minHeight: 132, borderRadius: 16, borderWidth: 1, justifyContent: "center", alignItems: "center", padding: 12, gap: 5 },
  mediaOptionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  mediaOptionText: { fontSize: 13, fontWeight: "700" },
  mediaOptionDescription: { fontSize: 10, textAlign: "center" },
  galleryGrid: { gap: 8 },
  thumbnailContainer: { flex: 1, position: "relative", marginHorizontal: 4, marginBottom: 8 },
  thumbnailPressable: { borderRadius: 10, overflow: "hidden" },
  thumbnail: { width: "100%", aspectRatio: 1, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  typeIndicator: { position: "absolute", bottom: 5, right: 5, width: 25, height: 25, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  shareBadge: { position: "absolute", top: 5, left: 5, width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", elevation: 2 },
  emptyContainer: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 13, fontWeight: "500" },
  lightboxContainer: { flex: 1, justifyContent: "space-between", backgroundColor: "rgba(0,0,0,0.95)" },
  lightboxHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 40, paddingBottom: 12 },
  headerActions: { flexDirection: "row", gap: 18, alignItems: "center" },
  lightboxCounter: { color: "#fff", fontSize: 14, fontWeight: "600" },
  lightboxContent: { flex: 1, justifyContent: "center", alignItems: "center", position: "relative" },
  lightboxImage: { width: "100%", height: "100%" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  lightboxFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24 },
  navigationButton: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  navigationButtonDisabled: { opacity: 0.5 },
});
