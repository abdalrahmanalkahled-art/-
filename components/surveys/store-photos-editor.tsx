import { useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { MediaSourcePickerModal } from "@/components/media-source-picker-modal";
import { useColors } from "@/hooks/use-colors";
import { launchCamera, launchImageLibrary } from "@/lib/media-picker";
import { persistSurveyStorePhoto } from "@/lib/survey-store-photos";

export function StorePhotosEditor({ photos, onChange }: { photos: string[]; onChange: (uris: string[]) => void }) {
  const colors = useColors();
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const addFromLibrary = () => void launchImageLibrary({ mediaType: "photo", quality: 0.9, allowsMultipleSelection: true }, (response) => {
    if (response.assets?.length) void Promise.all(response.assets.flatMap((asset) => asset.uri ? [persistSurveyStorePhoto(asset.uri)] : [])).then((saved) => onChange([...photos, ...saved]));
    else if (response.errorCode) Alert.alert("تعذر إضافة الصور", "يرجى المحاولة مجدداً.");
  });
  const addFromCamera = () => void launchCamera({ mediaType: "photo", quality: 0.9 }, (response) => {
    const uri = response.assets?.[0]?.uri;
    if (uri) void persistSurveyStorePhoto(uri).then((saved) => onChange([...photos, saved]));
    else if (response.errorCode) Alert.alert("تعذر التقاط الصورة", "يرجى المحاولة مجدداً.");
  });
  const getImageSize = (uri: string) => new Promise<{ width: number; height: number }>((resolve, reject) => Image.getSize(uri, (width, height) => resolve({ width, height }), reject));
  const transform = async (index: number, action: "rotate" | "crop") => {
    const uri = photos[index];
    if (!uri) return;
    setIsEditing(true);
    try {
      const actionSteps = action === "rotate" ? [{ rotate: 90 } as const] : await getImageSize(uri).then(({ width, height }) => {
        const side = Math.min(width, height);
        return [{ crop: { originX: Math.floor((width - side) / 2), originY: Math.floor((height - side) / 2), width: side, height: side } }];
      });
      const result = await ImageManipulator.manipulateAsync(uri, actionSteps, { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      const savedUri = await persistSurveyStorePhoto(result.uri);
      onChange(photos.map((photo, photoIndex) => photoIndex === index ? savedUri : photo));
    } catch {
      Alert.alert("تعذر تعديل الصورة", "يرجى المحاولة مجدداً.");
    } finally { setIsEditing(false); }
  };

  const activePhoto = activePhotoIndex === null ? undefined : photos[activePhotoIndex];

  return <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.header}><MaterialIcons name="photo-library" size={20} color={colors.primary} /><Text style={[styles.title, { color: colors.foreground }]}>صور المحل</Text></View>
    <Text style={[styles.hint, { color: colors.muted }]}>أضف صور المحل عند الحاجة، ثم اضغط على أي صورة لمعاينتها أو تدويرها أو قصها أو حذفها.</Text>
    {photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>{photos.map((uri, index) => <TouchableOpacity key={`${uri}_${index}`} onPress={() => setActivePhotoIndex(index)} style={[styles.photoCard, { borderColor: colors.border }]}><Image source={{ uri }} style={styles.preview} /><View style={[styles.previewCaption, { backgroundColor: colors.background }]}><MaterialIcons name="fullscreen" size={15} color={colors.primary} /><Text style={[styles.previewCaptionText, { color: colors.primary }]}>معاينة وتحرير</Text></View></TouchableOpacity>)}</ScrollView> : <Text style={[styles.empty, { color: colors.muted }]}>لم تُحدد صور بعد.</Text>}
    <TouchableOpacity onPress={() => setShowMediaPicker(true)} style={[styles.action, { backgroundColor: colors.primary + "14", borderColor: colors.primary }]}><MaterialIcons name="add-photo-alternate" size={18} color={colors.primary} /><Text style={[styles.actionText, { color: colors.primary }]}>إضافة صور المحل</Text></TouchableOpacity>
    <MediaSourcePickerModal visible={showMediaPicker} title="إضافة صور المحل" description="اختر التصوير المباشر أو إضافة صور من المعرض" libraryLabel="اختيار صور من المعرض" onClose={() => setShowMediaPicker(false)} onCamera={addFromCamera} onLibrary={addFromLibrary} />
    <Modal visible={Boolean(activePhoto)} transparent animationType="fade" onRequestClose={() => !isEditing && setActivePhotoIndex(null)}><View style={styles.viewerBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => !isEditing && setActivePhotoIndex(null)} /><View style={[styles.viewer, { backgroundColor: colors.surface }]}><View style={styles.viewerHeader}><TouchableOpacity disabled={isEditing} onPress={() => setActivePhotoIndex(null)} style={[styles.close, { backgroundColor: colors.background }]}><MaterialIcons name="close" size={21} color={colors.foreground} /></TouchableOpacity><Text style={[styles.viewerTitle, { color: colors.foreground }]}>صورة المحل</Text></View>{activePhoto ? <Image source={{ uri: activePhoto }} resizeMode="contain" style={styles.fullImage} /> : null}<View style={styles.viewerActions}><TouchableOpacity disabled={isEditing} onPress={() => activePhotoIndex !== null && void transform(activePhotoIndex, "rotate")} style={[styles.viewerAction, { borderColor: colors.primary, backgroundColor: colors.primary + "12" }]}><MaterialIcons name="rotate-right" size={20} color={colors.primary} /><Text style={[styles.viewerActionText, { color: colors.primary }]}>تدوير</Text></TouchableOpacity><TouchableOpacity disabled={isEditing} onPress={() => activePhotoIndex !== null && void transform(activePhotoIndex, "crop")} style={[styles.viewerAction, { borderColor: colors.primary, backgroundColor: colors.primary + "12" }]}><MaterialIcons name="crop" size={20} color={colors.primary} /><Text style={[styles.viewerActionText, { color: colors.primary }]}>قص</Text></TouchableOpacity><TouchableOpacity disabled={isEditing} onPress={() => activePhotoIndex !== null && setRemovingIndex(activePhotoIndex)} style={[styles.viewerAction, { borderColor: colors.error, backgroundColor: colors.error + "10" }]}><MaterialIcons name="delete-outline" size={20} color={colors.error} /><Text style={[styles.viewerActionText, { color: colors.error }]}>حذف</Text></TouchableOpacity></View>{isEditing ? <View style={styles.editing}><ActivityIndicator color={colors.primary} /><Text style={[styles.editingText, { color: colors.muted }]}>يتم حفظ التعديل…</Text></View> : null}</View></View></Modal>
    <ConfirmDialog visible={removingIndex !== null} title="حذف صورة المحل" message="هل تريد حذف هذه الصورة من نتيجة الاستبيان؟" confirmText="حذف الصورة" isDangerous icon="delete-outline" onCancel={() => setRemovingIndex(null)} onConfirm={() => { if (removingIndex !== null) onChange(photos.filter((_, index) => index !== removingIndex)); setRemovingIndex(null); setActivePhotoIndex(null); }} />
  </View>;
}

const styles = StyleSheet.create({ section: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 }, header: { flexDirection: "row-reverse", alignItems: "center", gap: 8 }, title: { fontSize: 15, fontWeight: "800" }, hint: { fontSize: 11, lineHeight: 17, textAlign: "right" }, empty: { textAlign: "center", paddingVertical: 8, fontSize: 12 }, photoList: { flexDirection: "row-reverse", gap: 9 }, photoCard: { width: 116, borderWidth: 1, borderRadius: 12, overflow: "hidden" }, preview: { width: 114, height: 86 }, previewCaption: { minHeight: 31, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4 }, previewCaptionText: { fontSize: 9, fontWeight: "700" }, action: { width: "100%", minHeight: 42, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 6 }, actionText: { fontSize: 12, fontWeight: "800" }, viewerBackdrop: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: "#00000088" }, viewer: { width: "100%", borderRadius: 20, padding: 14 }, viewerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, close: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }, viewerTitle: { fontSize: 16, fontWeight: "800" }, fullImage: { width: "100%", height: 330, borderRadius: 13, backgroundColor: "#000" }, viewerActions: { flexDirection: "row-reverse", gap: 8, marginTop: 12 }, viewerAction: { flex: 1, minHeight: 51, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center", gap: 2 }, viewerActionText: { fontSize: 11, fontWeight: "800" }, editing: { position: "absolute", inset: 0, borderRadius: 20, backgroundColor: "#ffffffd9", alignItems: "center", justifyContent: "center", gap: 9 }, editingText: { fontSize: 12, fontWeight: "700" } });
