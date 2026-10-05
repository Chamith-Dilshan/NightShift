import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const pkgPath = path.join(rootDir, "package.json");
const tauriConfPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
const cargoPath = path.join(rootDir, "src-tauri", "Cargo.toml");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
const cargoContent = fs.readFileSync(cargoPath, "utf-8");

const cargoVersionMatch = cargoContent.match(/^version\s*=\s*"([^"]+)"/m);
const cargoVersion = cargoVersionMatch ? cargoVersionMatch[1] : null;

console.log(`package.json version:    ${pkg.version}`);
console.log(`tauri.conf.json version: ${tauriConf.version}`);
console.log(`Cargo.toml version:      ${cargoVersion}`);

if (pkg.version !== tauriConf.version || pkg.version !== cargoVersion) {
  console.error("❌ Version mismatch across configuration files!");
  process.exit(1);
}

console.log("✅ Versions are synchronized across all manifests.");
