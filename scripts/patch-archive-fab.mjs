import { readFileSync, writeFileSync } from "node:fs";

const path = "app/roadside-contract-archive.tsx";
const source = readFileSync(path, "utf8");
let updated = source.replace(
  'import { SuccessModal } from "@/components/success-modal";\n',
  'import { SuccessModal } from "@/components/success-modal";\nimport { ReportFab } from "@/components/report-fab";\n',
);
updated = updated.replace(
  /<View style=\{styles\.headerActions\}>[\s\S]*?<\/View><\/View>\n    <View style=\{styles\.typeTabs\}>/,
  '</View>\n    <View style={styles.typeTabs}>',
);
updated = updated.replace(
  '    <SuccessModal visible={successMessage.visible} message={successMessage.message} onClose={() => setSuccessMessage({ visible: false, message: "" })} />\n  </ScreenContainer>;',
  '    <SuccessModal visible={successMessage.visible} message={successMessage.message} onClose={() => setSuccessMessage({ visible: false, message: "" })} />\n    <ReportFab module="signage" onSettings={() => setReportSettingsOpen(true)} onExport={(format) => void exportArchiveReport(format)} exporting={exporting} />\n  </ScreenContainer>;',
);
if (updated === source) throw new Error("Archive FAB patch made no changes");
writeFileSync(path, updated);
