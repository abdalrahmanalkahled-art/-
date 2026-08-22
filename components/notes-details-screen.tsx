import React, { useState, useEffect } from "react";
import { View, Text, Modal, ScrollView, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConfirmDeleteModal } from "./confirm-delete-modal";
import { SuccessModal } from "./success-modal";

interface Note {
  id: string;
  text: string;
  type: "إيجابي" | "سلبي" | "شكوى" | "اقتراح" | "تزكية";
  date: string;
  surveyId: string;
}

interface NotesDetailsScreenProps {
  visible: boolean;
  storeId: string;
  onClose: () => void;
  showComplaintsBtn?: boolean;
  onShowComplaints?: () => void;
}

export function NotesDetailsScreen({ visible, storeId, onClose, showComplaintsBtn, onShowComplaints }: NotesDetailsScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintFilter, setComplaintFilter] = useState<"الكل" | "مفتوح" | "قيد المتابعة" | "مغلق">("الكل");
  const [complaintStatus, setComplaintStatus] = useState<{ [key: string]: "مفتوح" | "قيد المتابعة" | "مغلق" }>({});
  const [complaintResolutionDate, setComplaintResolutionDate] = useState<{ [key: string]: string }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (visible) {
      loadNotes();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedType) {
      setFilteredNotes(notes.filter((n) => n.type === selectedType));
    } else {
      setFilteredNotes(notes);
    }
  }, [selectedType, notes]);

  const loadNotes = async () => {
    try {
      const surveys = await AsyncStorage.getItem("surveys");
      if (surveys) {
        const allSurveys = JSON.parse(surveys);
        const storeNotes = allSurveys
          .filter((s: any) => s.storeId === storeId)
          .flatMap((s: any) =>
            s.notes
              ? [
                  {
                    id: `${s.id}-${Date.now()}`,
                    text: s.notes,
                    type: s.type || "إيجابي",
                    date: s.date,
                    surveyId: s.id,
                  },
                ]
              : []
          )
          .sort((a: Note, b: Note) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setNotes(storeNotes);
        setFilteredNotes(storeNotes);
      }
      loadComplaints();
    } catch (error) {
      console.error("خطأ في تحميل الملاحظات:", error);
    }
  };

  const loadComplaints = async () => {
    try {
      const surveys = await AsyncStorage.getItem("surveys");
      if (surveys) {
        const allSurveys = JSON.parse(surveys);
        const complaintsData: any[] = [];
        allSurveys.forEach((survey: any) => {
          if ((survey.type === "شكوى" || survey.type === "سلبي") && survey.storeId === storeId) {
            complaintsData.push({
              id: survey.id,
              storeId: survey.storeId,
              type: survey.type,
              note: survey.notes,
              date: survey.date,
              status: "مفتوح",
            });
          }
        });
        setComplaints(complaintsData);
      }
    } catch (error) {
      console.error("خطأ في تحميل الشكاوى:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "إيجابي":
        return colors.success;
      case "سلبي":
        return colors.error;
      case "شكوى":
        return "#FF6B6B";
      case "اقتراح":
        return colors.warning;
      case "تزكية":
        return colors.primary;
      default:
        return colors.muted;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "إيجابي":
        return "thumb-up";
      case "سلبي":
        return "thumb-down";
      case "شكوى":
        return "report-problem";
      case "اقتراح":
        return "lightbulb";
      case "تزكية":
        return "star";
      default:
        return "note";
    }
  };

  const deleteNote = (surveyId: string) => {
    console.log("Delete button pressed for surveyId:", surveyId);
    setDeleteTargetId(surveyId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    
    try {
      console.log("Deleting survey with id:", deleteTargetId);
      const surveys = await AsyncStorage.getItem("surveys");
      if (surveys) {
        const allSurveys = JSON.parse(surveys);
        console.log("All surveys before delete:", allSurveys.length);
        const updatedSurveys = allSurveys.filter((s: any) => s.id !== deleteTargetId);
        console.log("All surveys after delete:", updatedSurveys.length);
        await AsyncStorage.setItem("surveys", JSON.stringify(updatedSurveys));
        await loadNotes();
        setShowDeleteConfirm(false);
        setDeleteTargetId(null);
        setSuccessMessage("تم حذف الملاحظة بنجاح");
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("خطأ في حذف الملاحظة:", error);
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setSuccessMessage("فشل حذف الملاحظة");
      setShowSuccessModal(true);
    }
  }

  const renderNoteItem = ({ item }: { item: Note }) => (
    <View style={[styles.noteItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.typeIcon, { backgroundColor: getTypeColor(item.type) + "20" }]}>
        <MaterialIcons name={getTypeIcon(item.type) as any} size={20} color={getTypeColor(item.type)} />
      </View>
      <View style={styles.noteContent}>
        <View style={styles.noteHeader}>
          <Text style={[styles.noteType, { color: getTypeColor(item.type) }]}>{item.type}</Text>
          <Text style={[styles.noteDate, { color: colors.muted }]}>{new Date(item.date).toLocaleDateString("en-US")}</Text>
        </View>
        <Text style={[styles.noteText, { color: colors.foreground }]}>{item.text}</Text>
      </View>
      <TouchableOpacity 
        onPress={() => {
          console.log("Delete pressed for:", item.surveyId);
          deleteNote(item.surveyId);
        }} 
        style={[styles.deleteBtn, { backgroundColor: colors.error + "20" }]}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        activeOpacity={0.6}
      >
        <MaterialIcons name="delete" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>جميع الملاحظات</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Filter Dropdown */}
        <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.filterDropdown, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Text style={[styles.filterDropdownText, { color: colors.foreground }]}>
              {selectedType || "الكل"}
            </Text>
            <MaterialIcons name={showFilterDropdown ? "arrow-drop-up" : "arrow-drop-down"} size={24} color={colors.foreground} />
          </TouchableOpacity>
          {showFilterDropdown && (
            <ScrollView style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedType(null);
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, { color: selectedType === null ? colors.primary : colors.foreground }]}>الكل</Text>
              </TouchableOpacity>
              {["إيجابي", "سلبي", "شكوى", "اقتراح", "تزكية"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedType(type);
                    setShowFilterDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: selectedType === type ? getTypeColor(type) : colors.foreground }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Notes or Complaints List */}
        {!showComplaints ? (
          <FlatList
            data={filteredNotes}
            renderItem={renderNoteItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.notesList, { paddingBottom: insets.bottom + 80 }]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="notes" size={48} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد ملاحظات</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={complaints}
            renderItem={({ item }) => (
              <View style={[styles.complaintItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.complaintTypeIcon, { backgroundColor: item.type === "شكوى" ? "#FF6B6B" : "#FFA500" }]}>
                  <MaterialIcons name={item.type === "شكوى" ? "error" : "warning"} size={20} color="#fff" />
                </View>
                <View style={styles.complaintContent}>
                  <Text style={[styles.complaintType, { color: colors.foreground }]}>{item.type}</Text>
                  <Text style={[styles.complaintNote, { color: colors.muted }]}>{item.note}</Text>
                  <Text style={[styles.complaintDate, { color: colors.muted }]}>{new Date(item.date).toLocaleDateString("en-US")}</Text>
                </View>
                <View style={styles.complaintActions}>
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: complaintStatus[item.id] === "مفتوح" ? "#FF6B6B" : complaintStatus[item.id] === "قيد المتابعة" ? "#FFA500" : "#4CAF50" }]}
                    onPress={() => {
                      const statuses: ("مفتوح" | "قيد المتابعة" | "مغلق")[] = ["مفتوح", "قيد المتابعة", "مغلق"];
                      const currentIndex = statuses.indexOf(complaintStatus[item.id] || "مفتوح");
                      const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                      setComplaintStatus({ ...complaintStatus, [item.id]: nextStatus });
                      if (nextStatus === "مغلق") {
                        setComplaintResolutionDate({ ...complaintResolutionDate, [item.id]: new Date().toLocaleDateString("en-US") });
                      }
                    }}
                  >
                    <Text style={styles.statusButtonText}>{complaintStatus[item.id] || "مفتوح"}</Text>
                  </TouchableOpacity>
                  {complaintResolutionDate[item.id] && (
                    <Text style={[styles.resolutionDate, { color: colors.muted }]}>تم الحل: {complaintResolutionDate[item.id]}</Text>
                  )}
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.notesList, { paddingBottom: insets.bottom + 80 }]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="done-all" size={48} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد شكاوى</Text>
              </View>
            }
          />
        )}

        {/* Action Buttons */}
        <View style={[styles.actionButtonsContainer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[styles.actionButton, !showComplaints && { backgroundColor: colors.primary }]}
            onPress={() => setShowComplaints(false)}
          >
            <MaterialIcons name="notes" size={20} color={!showComplaints ? "#fff" : colors.foreground} />
            <Text style={[styles.actionButtonText, { color: !showComplaints ? "#fff" : colors.foreground }]}>الملاحظات</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, showComplaints && { backgroundColor: colors.primary }]}
            onPress={() => setShowComplaints(true)}
          >
            <MaterialIcons name="warning" size={20} color={showComplaints ? "#fff" : colors.foreground} />
            <Text style={[styles.actionButtonText, { color: showComplaints ? "#fff" : colors.foreground }]}>الشكاوى</Text>
          </TouchableOpacity>
        </View>

          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDeleteModal
        visible={showDeleteConfirm}
        title="حذف الملاحظة"
        message="هل أنت متأكد من حذف هذه الملاحظة؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteTargetId(null);
        }}
        confirmText="حذف"
        cancelText="إلغاء"
      />

      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
        duration={2000}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700" as any },
  filterContainer: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  filterDropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  filterDropdownText: { fontSize: 14, fontWeight: "600" as any },
  dropdownMenu: { marginTop: 8, borderRadius: 8, borderWidth: 1, overflow: "hidden", maxHeight: 210 },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 13, fontWeight: "500" as any },
  notesList: { padding: 16 },
  noteItem: { borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, position: 'relative' },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  noteContent: { flex: 1 },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  noteType: { fontSize: 12, fontWeight: "700" as any },
  noteDate: { fontSize: 11, fontWeight: "500" as any },
  noteText: { fontSize: 13, fontWeight: "500" as any, lineHeight: 20 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 12 },
  complaintsBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  complaintsButtonContainer: { borderTopWidth: 1, padding: 16 },
  complaintsActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 14, borderRadius: 12 },
  complaintsActionBtnText: { fontSize: 14, fontWeight: "600" as any, color: "#fff", flex: 1, textAlign: "center" },
  complaintItem: { borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1 },
  complaintTypeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  complaintContent: { flex: 1 },
  complaintType: { fontSize: 13, fontWeight: "700" as any, marginBottom: 4 },
  complaintNote: { fontSize: 12, fontWeight: "500" as any, marginBottom: 4 },
  complaintDate: { fontSize: 11, fontWeight: "400" as any },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600" as any, color: "#fff" },
  actionButtonsContainer: { flexDirection: "row", borderTopWidth: 1, padding: 12, gap: 12, paddingTop: 12 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 8, gap: 8 },
  actionButtonText: { fontSize: 13, fontWeight: "600" as any },
  deleteBtn: { padding: 8, borderRadius: 6, minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  complaintActions: { flex: 1, alignItems: "flex-start", gap: 8 },
  statusButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusButtonText: { fontSize: 12, fontWeight: "600" as any, color: "#fff" },
  resolutionDate: { fontSize: 11, fontWeight: "500" as any },
});
