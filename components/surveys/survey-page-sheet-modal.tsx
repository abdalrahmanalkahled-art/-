import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { FloatingFormModal } from "@/components/floating-form-modal";

interface SurveyPageSheetModalProps {
  visible: boolean;
  onClose: () => void;
  backgroundColor: string;
  children: ReactNode;
}

/** غلاف موحّد لنوافذ الاستبيان التي تملأ الصفحة مع دعم الرجوع ولوحة المفاتيح. */
export function SurveyPageSheetModal({ visible, onClose, backgroundColor, children }: SurveyPageSheetModalProps) {
  return <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={backgroundColor}>
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor }}>{children}</SafeAreaView>
  </FloatingFormModal>;
}
