import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updateManagedUser } from "@/lib/user-management";
import { launchImageLibrary } from "@/lib/media-picker";
import type { LocalUser } from "@/lib/storage";
import { DESIGN } from "@/lib/design-system";

interface ProfileSettingsModalProps {
  visible: boolean;
  user: LocalUser | null;
  onClose: () => void;
  onSaved: (user: LocalUser) => void;
}

export function ProfileSettingsModal({ visible, user, onClose, onSaved }: ProfileSettingsModalProps) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCredentialsConfirmation, setShowCredentialsConfirmation] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setName(user.name);
    setAvatarUri(user.avatarUri);
    setUsername(user.username);
    setPassword("");
    setError("");
  }, [visible, user]);

  const persist = async () => {
    if (!user) return;
    setShowCredentialsConfirmation(false);
    setIsSaving(true);
    setError("");
    try {
      const updated = await updateManagedUser(user.id, { name: name.trim(), username: username.trim(), avatarUri, ...(password.trim() ? { password: password.trim() } : {}) });
      const next: LocalUser = { ...user, id: updated.id, name: updated.name, avatarUri: updated.avatarUri, username: updated.username, role: updated.role, permissions: updated.permissions, createdAt: updated.createdAt };
      onSaved(next);
      onClose();
    } catch (value) {
      setError(value instanceof Error ? value.message : "تعذر حفظ بيانات الملف الشخصي");
    } finally { setIsSaving(false); }
  };

  const chooseAvatar = () => {
    void launchImageLibrary({ mediaType: "photo", quality: 0.8 }, (result) => {
      if (result.assets?.[0]?.uri) setAvatarUri(result.assets[0].uri);
      else if (result.errorMessage) setError(result.errorMessage);
    });
  };

  const requestSave = () => {
    if (!user) return;
    if (!name.trim() || !username.trim()) { setError("أدخل الاسم الشخصي واسم المستخدم"); return; }
    const credentialsChanged = username.trim().toLowerCase() !== user.username || Boolean(password.trim());
    if (credentialsChanged) {
      setShowCredentialsConfirmation(true);
      return;
    }
    void persist();
  };

  return <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}><TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: colors.background }]}><MaterialIcons name="close" size={20} color={colors.foreground} /></TouchableOpacity><View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>إدارة الملف الشخصي</Text><Text style={[styles.subtitle, { color: colors.muted }]}>عدّل الاسم وبيانات الدخول الخاصة بك</Text></View></View>
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "16", borderColor: colors.border }]}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <MaterialIcons name="person" size={38} color={colors.primary} />}
          </View>
          <View style={styles.avatarActions}>
            <Text style={[styles.avatarTitle, { color: colors.foreground }]}>الصورة الشخصية</Text>
            <View style={styles.avatarButtons}>
              <TouchableOpacity onPress={chooseAvatar} style={[styles.avatarButton, { backgroundColor: colors.primary + "12", borderColor: colors.primary }]}><MaterialIcons name="photo-camera" size={16} color={colors.primary} /><Text style={[styles.avatarButtonText, { color: colors.primary }]}>{avatarUri ? "تغيير الصورة" : "إضافة صورة"}</Text></TouchableOpacity>
              {avatarUri ? <TouchableOpacity onPress={() => setAvatarUri(undefined)} style={[styles.avatarButton, { backgroundColor: colors.error + "10", borderColor: colors.error }]}><MaterialIcons name="delete-outline" size={16} color={colors.error} /><Text style={[styles.avatarButtonText, { color: colors.error }]}>إزالة</Text></TouchableOpacity> : null}
            </View>
          </View>
        </View>
        <Text style={[styles.label, { color: colors.foreground }]}>الاسم الشخصي</Text>
        <TextInput value={name} onChangeText={setName} placeholder="أدخل الاسم الشخصي" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} textAlign="right" />
        <Text style={[styles.label, { color: colors.foreground }]}>اسم المستخدم</Text>
        <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="admin" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} textAlign="left" />
        <Text style={[styles.label, { color: colors.foreground }]}>كلمة المرور الجديدة</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="اتركها فارغة للإبقاء على الحالية" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} textAlign="left" />
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <TouchableOpacity disabled={isSaving} onPress={requestSave} style={[styles.save, { backgroundColor: colors.primary }, isSaving && { opacity: 0.6 }]}><Text style={styles.saveText}>{isSaving ? "جارٍ الحفظ..." : "حفظ بيانات الملف"}</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </Modal>
    <ConfirmDialog visible={showCredentialsConfirmation} title="تأكيد تغيير بيانات الدخول" message="سيتم حفظ اسم المستخدم أو كلمة المرور الجديدة على هذا الجهاز. هل تريد المتابعة؟" confirmText="حفظ التغييرات" cancelText="مراجعة البيانات" icon="lock" onCancel={() => setShowCredentialsConfirmation(false)} onConfirm={() => void persist()} />
  </>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: DESIGN.spacing.md },
  dialog: { width: "100%", maxWidth: 460, alignSelf: "center", borderRadius: DESIGN.radius.xl, borderWidth: 1, padding: DESIGN.spacing.xl, gap: DESIGN.spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: DESIGN.spacing.sm, marginBottom: DESIGN.spacing.sm },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: DESIGN.spacing.md, marginBottom: DESIGN.spacing.sm },
  avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarActions: { flex: 1, alignItems: "flex-end", gap: DESIGN.spacing.sm },
  avatarTitle: { fontSize: 13, fontWeight: "800" },
  avatarButtons: { flexDirection: "row", gap: DESIGN.spacing.sm },
  avatarButton: { minHeight: 36, paddingHorizontal: DESIGN.spacing.sm, borderRadius: DESIGN.radius.sm, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  avatarButtonText: { fontSize: 11, fontWeight: "800" },
  close: { width: DESIGN.control.compact, height: DESIGN.control.compact, borderRadius: DESIGN.radius.sm, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, alignItems: "flex-end", gap: 2 },
  title: { fontSize: 17, fontWeight: "800", textAlign: "right" },
  subtitle: { fontSize: 11, textAlign: "right" },
  label: { fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: DESIGN.spacing.xs },
  input: { minHeight: DESIGN.control.standard, borderWidth: 1, borderRadius: DESIGN.radius.md, paddingHorizontal: DESIGN.spacing.md, fontSize: 14 },
  error: { fontSize: 12, textAlign: "right" },
  save: { minHeight: DESIGN.control.standard, borderRadius: DESIGN.radius.md, alignItems: "center", justifyContent: "center", marginTop: DESIGN.spacing.sm },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
