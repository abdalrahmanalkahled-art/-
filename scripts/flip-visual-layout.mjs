import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = execFileSync("rg", ["-l", "flexDirection|textAlign|alignItems|alignSelf|arrow-forward|arrow-back|chevron-right|chevron-left", "app", "components"], { encoding: "utf8" }).split("\n").filter(Boolean);
for (const path of files) {
  const source = readFileSync(path, "utf8");
  const updated = source
    .replace(/flexDirection:\s*["']row-reverse["']/g, 'flexDirection: "row"')
    .replace(/textAlign:\s*["']right["']/g, 'textAlign: "left"')
    .replace(/alignItems:\s*["']flex-end["']/g, 'alignItems: "flex-start"')
    .replace(/alignSelf:\s*["']flex-end["']/g, 'alignSelf: "flex-start"')
    .replace(/justifyContent:\s*["']flex-end["']/g, 'justifyContent: "flex-start"')
    .replace(/\"arrow-forward\"/g, "\"__ARROW_FORWARD__\"")
    .replace(/\"arrow-back\"/g, "\"arrow-forward\"")
    .replace(/\"__ARROW_FORWARD__\"/g, "\"arrow-back\"")
    .replace(/\"chevron-right\"/g, "\"__CHEVRON_RIGHT__\"")
    .replace(/\"chevron-left\"/g, "\"chevron-right\"")
    .replace(/\"__CHEVRON_RIGHT__\"/g, "\"chevron-left\"");
  if (updated !== source) writeFileSync(path, updated);
}
console.log(`Flipped visual layout in ${files.length} files.`);
