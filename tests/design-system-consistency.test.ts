import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("نظام التصميم للشاشات الداخلية", () => {
  it("يحتوي على رموز مشتركة للمسافات والحواف والحالات", () => {
    const design = read("lib/design-system.ts");
    expect(design).toContain("spacing");
    expect(design).toContain("radius");
    expect(design).toContain("control");
    expect(design).toContain("longPressDelay");
  });

  it("تستخدم النوافذ والبطاقات رموز التصميم المشتركة", () => {
    expect(read("components/animated-card.tsx")).toContain("DESIGN.press.scale");
    expect(read("components/card-action-modal.tsx")).toContain("DESIGN.radius.xl");
    expect(read("components/floating-form-modal.tsx")).toContain("DESIGN.radius.xl");
    expect(read("components/confirm-dialog.tsx")).toContain("DESIGN.control.standard");
    expect(read("components/success-modal.tsx")).toContain("DESIGN.radius.lg");
  });

  it("تستخدم صفحة التفاصيل الرأس المشترك والحاوية تعلن LTR", () => {
    expect(read("app/goal-details.tsx")).toContain("<AppPageHeader");
    expect(read("components/app-page-header.tsx")).toContain('flexDirection: "row"');
    expect(read("components/screen-container.tsx")).toContain('direction: "ltr"');
  });
});
