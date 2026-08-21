import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BackupMergePreview, BackupMergePreviewGroup } from "./backup-merge";
import type { BackupPreview, RestoreMode } from "./backup-restore";
import type { BackupSectionId, FullBackupPayload } from "./full-backup";

export const LAST_RESTORE_HISTORY_KEY = "@madar_last_restore_history_v1";

export interface LastRestoreHistory {
  restoredAt: string;
  sourceLabel: string;
  sourceCreatedAt: string;
  backupKind: "full" | "partial";
  sections: BackupSectionId[];
  mode: RestoreMode;
  dataGroupCount: number;
  recordCount: number;
  mediaCount: number;
  skippedMediaCount: number;
  preservedSettings: number;
  merge?: Pick<BackupMergePreview, "added" | "updated" | "retained">;
  groups: BackupMergePreviewGroup[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** يبني سجلاً قابلاً للمراجعة لآخر استعادة دون حفظ أي بيانات حساسة من النسخة نفسها. */
export function createLastRestoreHistory(payload: FullBackupPayload, preview: BackupPreview, mode: RestoreMode, sourceLabel: string, mergePreview?: BackupMergePreview): LastRestoreHistory {
  const preservedSettings = Object.keys(payload.data).filter((key) => key.includes("settings") || key.includes("preference") || key.includes("customization")).length;
  const groups = mode === "merge" && mergePreview
    ? mergePreview.groups
    : preview.groups.map((group) => ({ key: group.key, label: group.label, added: 0, updated: group.records, retained: 0 }));

  return {
    restoredAt: new Date().toISOString(),
    sourceLabel,
    sourceCreatedAt: payload.createdAt,
    backupKind: payload.backupKind || "full",
    sections: payload.sections || [],
    mode,
    dataGroupCount: preview.dataGroupCount,
    recordCount: preview.recordCount,
    mediaCount: preview.mediaCount,
    skippedMediaCount: preview.skippedMediaCount,
    preservedSettings: mode === "merge" ? mergePreview?.preservedSettings || 0 : preservedSettings,
    ...(mode === "merge" && mergePreview ? { merge: { added: mergePreview.added, updated: mergePreview.updated, retained: mergePreview.retained } } : {}),
    groups,
  };
}

export async function saveLastRestoreHistory(history: LastRestoreHistory): Promise<void> {
  await AsyncStorage.setItem(LAST_RESTORE_HISTORY_KEY, JSON.stringify(history));
}

export async function getLastRestoreHistory(): Promise<LastRestoreHistory | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_RESTORE_HISTORY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.restoredAt !== "string" || typeof parsed.sourceLabel !== "string" || (parsed.mode !== "replace" && parsed.mode !== "merge")) return null;
    return parsed as unknown as LastRestoreHistory;
  } catch {
    return null;
  }
}
