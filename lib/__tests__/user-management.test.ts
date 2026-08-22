import { beforeEach, describe, expect, it, vi } from "vitest";

const values = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
  },
}));

import { authenticateManagedUser, createManagedUser, getManagedUsers, updateManagedUser } from "../user-management";
import { ROLE_PERMISSION_PRESETS } from "../user-permissions-model";

describe("إدارة المستخدمين", () => {
  beforeEach(() => values.clear());

  it("يهيئ الحساب الافتراضي admin بكلمة المرور المطلوبة", async () => {
    const users = await getManagedUsers();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ username: "admin", password: "123", role: "system_admin" });
    expect((await authenticateManagedUser("admin", "123"))?.username).toBe("admin");
  });

  it("ينشئ حساباً بصلاحيات الدور المختار ويتيح تسجيل دخوله", async () => {
    const user = await createManagedUser({ name: "مندوب المنطقة", username: "field.user", password: "secret1", role: "field_supervisor" });
    expect(user.permissions).toEqual(ROLE_PERMISSION_PRESETS.field_supervisor);
    expect((await authenticateManagedUser("field.user", "secret1"))?.id).toBe(user.id);
  });

  it("يمنع تكرار اسم المستخدم ويحدّث الصلاحيات المخصصة", async () => {
    const user = await createManagedUser({ name: "قارئ", username: "reader", password: "secret1", role: "viewer" });
    await expect(createManagedUser({ name: "مكرر", username: "reader", password: "secret2", role: "viewer" })).rejects.toThrow("مستخدم بالفعل");
    const updated = await updateManagedUser(user.id, { permissions: { ...ROLE_PERMISSION_PRESETS.viewer, stores: ["view"] } });
    expect(updated.permissions.stores).toEqual(["view"]);
    expect((await getManagedUsers()).find((entry) => entry.id === user.id)?.permissions.stores).toEqual(["view"]);
  });

  it("يتيح تعديل الاسم الشخصي واسم المستخدم وكلمة المرور", async () => {
    const user = await createManagedUser({ name: "اسم قديم", username: "profile.user", password: "secret1", role: "viewer" });
    const updated = await updateManagedUser(user.id, { name: "اسم شخصي", username: "profile.updated", password: "new123" });
    expect(updated).toMatchObject({ name: "اسم شخصي", username: "profile.updated", password: "new123" });
    expect((await authenticateManagedUser("profile.updated", "new123"))?.id).toBe(user.id);
  });
});
