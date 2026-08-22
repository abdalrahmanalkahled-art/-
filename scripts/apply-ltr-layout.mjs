import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const files = execFileSync("rg", ["-l", 'flexDirection: "row-reverse"', "app", "components", "lib"], { encoding: "utf8" }).split("\n").filter(Boolean);
for (const path of files) {
  const source = readFileSync(path, "utf8");
  const updated = source.replaceAll('flexDirection: "row-reverse"', 'flexDirection: "row"');
  if (updated !== source) writeFileSync(path, updated);
}
console.log(`Converted ${files.length} files to LTR row layout.`);
