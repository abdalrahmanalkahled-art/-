import { describe, expect, it } from "vitest";

import { createLastRestoreHistory } from "../backup-restore-history";

describe("سجل آخر عملية استعادة", () => {
  it("يسجل تفاصيل الكتابة فوق ومجموعات البيانات دون حفظ محتوى النسخة", () => {
    const history = createLastRestoreHistory(
      { schemaVersion: 1, type: "madar-full-backup", backupKind: "partial", sections: ["stores"], createdAt: "2026-08-21T08:00:00.000Z", data: { madar_stores: "[]" }, media: [], skippedMediaPaths: [] },
      { createdAt: "2026-08-21T08:00:00.000Z", dataGroupCount: 1, recordCount: 3, mediaCount: 2, skippedMediaCount: 1, isPartial: true, sections: ["stores"], groups: [{ key: "madar_stores", label: "المحلات", records: 3 }] },
      "merge",
      "نسخة المحلات.json",
      { added: 1, updated: 1, retained: 1, preservedSettings: 0, groups: [{ key: "madar_stores", label: "المحلات", added: 1, updated: 1, retained: 1 }] },
    );

    expect(history).toMatchObject({ sourceLabel: "نسخة المحلات.json", mode: "merge", backupKind: "partial", recordCount: 3, mediaCount: 2, merge: { added: 1, updated: 1, retained: 1 } });
    expect(history.groups).toEqual([{ key: "madar_stores", label: "المحلات", added: 1, updated: 1, retained: 1 }]);
    expect(history).not.toHaveProperty("data");
  });
});
