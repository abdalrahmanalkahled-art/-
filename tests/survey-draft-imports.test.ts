import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("ربط مسودة الاستبيان", () => {
  it("يستورد hooks اللازمة لمسودة الاستبيان قبل استخدامهما", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/surveys.tsx"), "utf8");
    expect(source).toMatch(/import React, \{[^}]*useEffect[^}]*useRef[^}]*\} from "react"/);
    expect(source).toContain("const restoredSurveyDraftId = useRef");
  });
});
