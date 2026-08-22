import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const output = execFileSync("rg", ["-l", "toLocaleString|toLocaleDateString", "app", "components", "lib"], { encoding: "utf8" });
const files = output.split("\n").map((file) => file.trim()).filter(Boolean);

for (const relativePath of files) {
  const path = `${root}/${relativePath}`;
  const source = readFileSync(path, "utf8");
  const updated = source
    .replace(/\.toLocaleString\(\"ar-(?:SY|SA)\"\)/g, '.toLocaleString("en-US")')
    .replace(/\.toLocaleDateString\(\"ar-(?:SY|SA)\"\)/g, '.toLocaleDateString("en-US")')
    .replace(/\.toLocaleString\(\)/g, '.toLocaleString("en-US")')
    .replace(/\.toLocaleDateString\(\)/g, '.toLocaleDateString("en-US")');
  if (updated !== source) writeFileSync(path, updated);
}

console.log(`Normalized western number/date locale in ${files.length} files.`);
