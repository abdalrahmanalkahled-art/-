import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";

interface MediaSourcePickerModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  cameraLabel?: string;
  libraryLabel?: string;
  onClose: () => void;
  onCamera?: () => void;
  onLibrary: () => void;
}

export function MediaSourcePickerModal({
  visible,
  title = "إضافة صورة",
  description = "اختر مصدر الصورة التي تريد إضافتها",
  cameraLabel = "التقاط صورة",
  libraryLabel = "اختيار من المعرض",
  onClose,
  onCamera,
  onLibrary,
}: MediaSourcePickerModalProps) {
  const colors = useColors();
  const hasCamera = Boolean(onCamera);

  const choose = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="إغلاق خيارات الوسائط" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.background }]} accessibilityLabel="إغلاق خيارات الوسائط">
              <MaterialIcons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
              <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
            </View>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + "18" }]}>
              <MaterialIcons name="perm-media" size={20} color={colors.primary} />
            </View>
          </View>
          <View style={styles.options}>
            {hasCamera ? (
              <MediaOption label={cameraLabel} description="باستخدام كاميرا الهاتف" icon="photo-camera" onPress={() => choose(onCamera!)} colors={colors} />
            ) : null}
            <MediaOption label={libraryLabel} description="من ملفات الجهاز أو المعرض" icon="image" onPress={() => choose(onLibrary)} colors={colors} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MediaOption({ label, description, icon, onPress, colors }: { label: string; description: string; icon: "photo-camera" | "image"; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.option, { borderColor: colors.border, backgroundColor: colors.background }]} activeOpacity={0.72}>
      <View style={[styles.optionIcon, { backgroundColor: colors.primary + "16" }]}>
        <MaterialIcons name={icon} size={25} color={colors.primary} />
      </View>
      <Text style={[styles.optionLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.optionDescription, { color: colors.muted }]}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", paddingHorizontal: 20, backgroundColor: "#0000002E" },
  sheet: { width: "100%", maxWidth: 360, alignSelf: "center", borderWidth: 1, borderRadius: 22, padding: 15, gap: 14, elevation: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 11 },
  headerIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, alignItems: "flex-start" },
  title: { fontSize: 16, fontWeight: "800" as any, textAlign: "left" },
  description: { fontSize: 11, lineHeight: 17, textAlign: "left", marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  options: { flexDirection: "row", gap: 10 },
  option: { flex: 1, minHeight: 104, borderRadius: 16, borderWidth: 1, justifyContent: "center", alignItems: "center", padding: 10, gap: 4 },
  optionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  optionLabel: { fontSize: 13, fontWeight: "700" as any, textAlign: "center" },
  optionDescription: { fontSize: 10, textAlign: "center" },
});
