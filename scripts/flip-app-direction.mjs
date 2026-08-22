import { readFileSync, writeFileSync } from "node:fs";

for (const path of ["app/_layout.tsx", "components/screen-container.tsx"]) {
  const source = readFileSync(path, "utf8");
  const updated = source
    .replace("I18nManager.allowRTL(true);", "I18nManager.allowRTL(false);\nI18nManager.forceRTL(false);")
    .replace('direction: "rtl"', 'direction: "ltr"');
  if (updated === source) throw new Error(`No direction update made in ${path}`);
  writeFileSync(path, updated);
}

const tabsPath = "app/(tabs)/_layout.tsx";
const source = readFileSync(tabsPath, "utf8");
const names = ["index", "stores", "surveys", "events", "more"];
const blocks = names.map((name) => {
  const start = source.indexOf(`      <Tabs.Screen\n        name="${name}"`);
  if (start < 0) throw new Error(`Missing tab ${name}`);
  const end = source.indexOf("      </Tabs.Screen>", start) + "      </Tabs.Screen>".length;
  return source.slice(start, end);
});
const ordered = [...blocks].reverse().join("\n");
const first = source.indexOf("      <Tabs.Screen");
const last = source.lastIndexOf("      </Tabs.Screen>") + "      </Tabs.Screen>".length;
writeFileSync(tabsPath, `${source.slice(0, first)}${ordered}${source.slice(last)}`);
