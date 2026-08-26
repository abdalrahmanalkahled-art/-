import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: storage }));

import { clearAuditLogs, getAuditLogs, logAudit } from "../audit-log";

describe("سجل النشاط المحلي", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("يضيف النشاط الأحدث في المقدمة ويحفظ توقيتاً قابلاً للفرز", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify([{ id: "old", action: "CREATE", module: "المحلات", description: "قديم", username: "مندوب ميداني", timestamp: "2026-01-01T00:00:00.000Z" }]));
    await logAudit("EXPORT", "التقارير", "تم إنشاء تقرير PDF");
    const saved = JSON.parse(storage.setItem.mock.calls[0][1]);
    expect(saved[0]).toMatchObject({ action: "EXPORT", module: "التقارير", description: "تم إنشاء تقرير PDF" });
    expect(new Date(saved[0].timestamp).toISOString()).toBe(saved[0].timestamp);
  });

  it("يتجاهل البيانات التالفة ويعيد سجلاً فارغاً بأمان", async () => {
    storage.getItem.mockResolvedValue("{غير صالح");
    await expect(getAuditLogs()).resolves.toEqual([]);
  });

  it("يمسح السجل من الهاتف من دون لمس بيانات الأعمال", async () => {
    await clearAuditLogs();
    expect(storage.removeItem).toHaveBeenCalledWith("@madar_audit_logs_v1");
  });
});
