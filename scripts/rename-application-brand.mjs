import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const files = execFileSync("rg", ["-l", "مدير تسويق مدار", "app", "components", "lib", "app.config.ts", "template.json"], { encoding: "utf8" }).split("\n").filter(Boolean);
for (const path of files) {
  const source = readFileSync(path, "utf8");
  const updated = source.replaceAll("مدير تسويق مدار", "مساعد التسويق الميداني");
  if (updated !== source) writeFileSync(path, updated);
}
const config = readFileSync("app.config.ts", "utf8").replaceAll('appName: "مدير تسويق مدار"', 'appName: "مساعد التسويق الميداني"');
writeFileSync("app.config.ts", config);
console.log(`Renamed brand in ${files.length} files.`);
