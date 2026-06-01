import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("node", ["scripts/prepare-cap-build.mjs"]);
try {
  run("npx", ["next", "build"], { CAPACITOR_BUILD: "1" });
} finally {
  run("node", ["scripts/restore-cap-build.mjs"]);
}
console.log("[cap-build] Static export complete -> out/");
