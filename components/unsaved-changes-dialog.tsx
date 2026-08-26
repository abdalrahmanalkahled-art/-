import { ConfirmDialog } from "@/components/confirm-dialog";

interface UnsavedChangesDialogProps {
  visible: boolean;
  onDiscard: () => void;
  onKeepEditing: () => void;
}

/** تأكيد موحد يحمي إدخال النموذج قبل إغلاقه من الخلفية أو زر الرجوع. */
export function UnsavedChangesDialog({ visible, onDiscard, onKeepEditing }: UnsavedChangesDialogProps) {
  return (
    <ConfirmDialog
      visible={visible}
      title="تجاهل التغييرات؟"
      message="لديك تعديلات غير محفوظة. يمكنك متابعة التحرير أو تجاهل التغييرات وإغلاق النموذج."
      confirmText="تجاهل التغييرات"
      cancelText="متابعة التحرير"
      isDangerous
      icon="edit-note"
      onCancel={onKeepEditing}
      onConfirm={onDiscard}
    />
  );
}
