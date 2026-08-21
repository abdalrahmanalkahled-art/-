import { describe, expect, it } from "vitest";

import { createDefaultAppCustomization, customizationAllows, normalizeAppCustomization } from "../app-customization-model";

describe("نموذج تخصيص التطبيق", () => {
  it("يبدأ بإظهار كل التبويبات والسماح بالإجراءات", () => {
    const settings = createDefaultAppCustomization();
    expect(customizationAllows(settings, "stores", "view")).toBe(true);
    expect(customizationAllows(settings, "surveys", "create")).toBe(true);
    expect(customizationAllows(settings, "analytics", "delete")).toBe(true);
  });

  it("يحترم إخفاء تبويب ومنع إجراء مستقل", () => {
    const settings = createDefaultAppCustomization();
    settings.modules.stores.visible = false;
    settings.modules.surveys.actions.delete = false;
    expect(customizationAllows(settings, "stores", "view")).toBe(false);
    expect(customizationAllows(settings, "surveys", "delete")).toBe(false);
    expect(customizationAllows(settings, "surveys", "edit")).toBe(true);
  });

  it("يبقي الإعدادات متاحة دائماً حتى لا يُقفل التطبيق", () => {
    const settings = normalizeAppCustomization({ modules: { settings: { visible: false, actions: { view: false, create: false, edit: false, delete: false, export: false, manage: false } } } });
    expect(settings.modules.settings.visible).toBe(true);
    expect(settings.modules.settings.actions.manage).toBe(true);
  });
});
