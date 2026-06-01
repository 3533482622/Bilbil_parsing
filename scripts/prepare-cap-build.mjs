import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const apiDir = path.join(root, "src", "app", "api");
const backupDir = path.join(root, "src", "app", "_api_cap_backup");

function collectRouteFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) collectRouteFiles(full, acc);
    else if (name === "route.ts") acc.push(full);
  }
  return acc;
}

if (!fs.existsSync(apiDir)) {
  console.log("[cap-build] No API routes directory");
  process.exit(0);
}

if (fs.existsSync(backupDir)) {
  fs.rmSync(backupDir, { recursive: true, force: true });
}

const copy = spawnSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Copy-Item -LiteralPath '${apiDir.replace(/'/g, "''")}' -Destination '${backupDir.replace(/'/g, "''")}' -Recurse -Force`,
  ],
  { cwd: root, stdio: "inherit" },
);

if (copy.status !== 0) {
  console.error("[cap-build] Backup copy failed");
  process.exit(copy.status ?? 1);
}

const routes = collectRouteFiles(apiDir);
for (const routeFile of routes) {
  try {
    fs.unlinkSync(routeFile);
  } catch (err) {
    console.error(
      `[cap-build] 无法删除 ${routeFile}，请先停止 npm run dev 后重试:`,
      err.message,
    );
    process.exit(1);
  }
}

console.log(`[cap-build] 已暂移 ${routes.length} 个 API route 以供静态导出`);
