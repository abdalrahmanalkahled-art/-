import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { login } from "@/lib/storage";
import { useApp } from "@/lib/app-context";
import { useColors } from "@/hooks/use-colors";

export default function LoginScreen() {
  const colors = useColors();
  const { dispatch } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const user = await login(username.trim(), password, rememberMe);
      if (!user) {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
        return;
      }
      dispatch({ type: "SET_USER", payload: user });
      router.replace("/(tabs)");
    } catch {
      setError("حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}><Text style={styles.logoText}>م</Text></View>
          <Text style={[styles.appName, { color: colors.foreground }]}>مدير تسويق مدار</Text>
          <Text style={[styles.appSubtitle, { color: colors.muted }]}>نظام إدارة التسويق الميداني</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>تسجيل الدخول</Text>
          {error ? <View style={[styles.errorBox, { backgroundColor: colors.error + "20", borderColor: colors.error }]}><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View> : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>اسم المستخدم</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={username} onChangeText={setUsername} placeholder="أدخل اسم المستخدم" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} returnKeyType="next" textAlign="right" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>كلمة المرور</Text>
            <View style={[styles.passwordField, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput style={[styles.passwordInput, { color: colors.foreground }]} value={password} onChangeText={setPassword} placeholder="أدخل كلمة المرور" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={handleLogin} textAlign="right" />
              <TouchableOpacity accessibilityLabel={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onPress={() => setShowPassword((visible) => !visible)} style={styles.passwordToggle}>
                <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => setRememberMe((value) => !value)} activeOpacity={0.75} style={styles.rememberRow}>
            <View style={[styles.rememberBox, { borderColor: rememberMe ? colors.primary : colors.border, backgroundColor: rememberMe ? colors.primary : "transparent" }]}>{rememberMe ? <MaterialIcons name="check" size={15} color="#fff" /> : null}</View>
            <Text style={[styles.rememberText, { color: colors.foreground }]}>تذكرني على هذا الجهاز</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }, loading && styles.loginButtonDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>دخول</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  logoContainer: { width: 80, height: 80, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  logoText: { fontSize: 40, fontWeight: "900" as const, color: "#fff" },
  appName: { fontSize: 26, fontWeight: "800" as const, marginBottom: 4, textAlign: "center" },
  appSubtitle: { fontSize: 14, textAlign: "center" },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardTitle: { fontSize: 20, fontWeight: "700" as const, marginBottom: 20, textAlign: "center" },
  errorBox: { borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1 },
  errorText: { fontSize: 14, textAlign: "center" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600" as const, marginBottom: 8, textAlign: "left" },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, textAlign: "left" },
  passwordField: { minHeight: 52, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, textAlign: "left" },
  passwordToggle: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  rememberRow: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 8, marginBottom: 16 },
  rememberBox: { width: 21, height: 21, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rememberText: { fontSize: 13, fontWeight: "600" as const },
  loginButton: { borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" as const },
});
