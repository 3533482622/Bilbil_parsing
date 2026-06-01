import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const apiDir = path.join(root, "src", "app", "api");
const backupDir = path.join(root, "src", "app", "_api_cap_backup");

if (!fs.existsSync(backupDir)) {
  console.log("[cap-build] Nothing to restore");
  process.exit(0);
}

function copyRoutes(srcDir, destDir) {
  for (const name of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      copyRoutes(src, dest);
    } else if (name === "route.ts") {
      fs.copyFileSync(src, dest);
    }
  }
}

if (!fs.existsSync(apiDir)) {
  const restore = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Copy-Item -LiteralPath '${backupDir.replace(/'/g, "''")}' -Destination '${apiDir.replace(/'/g, "''")}' -Recurse -Force`,
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (restore.status !== 0) process.exit(restore.status ?? 1);
} else {
  copyRoutes(backupDir, apiDir);
}

fs.rmSync(backupDir, { recursive: true, force: true });
console.log("[cap-build] API routes restored");
