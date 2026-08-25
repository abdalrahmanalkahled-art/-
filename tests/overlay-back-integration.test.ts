import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("تكامل رجوع النوافذ والتحديد", () => {
  it("يطبق المعالج الموحد على الاستبيانات والمحلات والفعاليات", () => {
    ["app/(tabs)/surveys.tsx", "app/(tabs)/stores.tsx", "app/(tabs)/events.tsx"].forEach((path) => {
      expect(projectFile(path)).toContain("useOverlayBackHandler");
    });
  });

  it("يلغي التحديد أو يغلق التأكيد قبل الرجوع في شاشات التخزين", () => {
    ["app/backup-management.tsx", "app/storage-details/[bucket].tsx"].forEach((path) => {
      const source = projectFile(path);
      expect(source).toContain("closeTopOverlay");
      expect(source).toContain("exitSelection()");
    });
  });

  it("يحمي تفاصيل الفعالية من إغلاق الشاشة قبل الإجراء الداخلي", () => {
    const source = projectFile("components/event-details-modal.tsx");
    expect(source).toContain("handleDetailsOverlayBack");
    expect(source).toContain("closeDetailsOrTop");
  });
});
