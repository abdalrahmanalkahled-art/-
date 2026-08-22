import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const modal = readFileSync(resolve(process.cwd(), "components/profile-settings-modal.tsx"), "utf8");
const storage = readFileSync(resolve(process.cwd(), "lib/storage.ts"), "utf8");
const more = readFileSync(resolve(process.cwd(), "app/(tabs)/more.tsx"), "utf8");

describe("صورة الملف الشخصي", () => {
  it("يختار صورة من المنتقي ويحفظ مسارها ضمن المستخدم", () => {
    expect(modal).toContain('launchImageLibrary({ mediaType: "photo"');
    expect(modal).toContain("setAvatarUri(result.assets[0].uri)");
    expect(modal).toContain("avatarUri,");
    expect(modal).toContain("avatarUri !== user.avatarUri");
    expect(modal).toContain("saveStoredUser(next)");
    expect(storage).toContain("avatarUri?: string;");
    expect(storage).toContain("avatarUri: managedUser.avatarUri");
  });

  it("يعرض المعاينة وخيار التغيير والإزالة", () => {
    expect(modal).toContain("styles.avatarImage");
    expect(modal).toContain("تغيير الصورة");
    expect(modal).toContain("إزالة");
    expect(more).toContain("user.avatarUri");
    expect(more).toContain("styles.userAvatarImage");
  });
});
