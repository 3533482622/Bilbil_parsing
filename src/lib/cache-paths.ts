import fs from "fs";
import os from "os";
import path from "path";

const DEFAULT_CACHE_DIR =
  process.env.NODE_ENV === "production"
    ? path.join(os.tmpdir(), "bili-parser-cache")
    : path.join(process.cwd(), ".cache");

export const CACHE_DIR = process.env.CACHE_DIR
  ? path.resolve(process.env.NODE_ENV === "production" ? os.tmpdir() : process.cwd(), process.env.CACHE_DIR)
  : DEFAULT_CACHE_DIR;

export const DOWNLOAD_DIR = path.join(CACHE_DIR, "download");
export const OUTPUT_DIR = path.join(CACHE_DIR, "output");

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** 将绝对路径转为 /api/serve/... URL */
export function absolutePathToServeUrl(absPath: string): string {
  const resolved = path.resolve(absPath);
  const cacheRoot = path.resolve(CACHE_DIR);
  if (!resolved.startsWith(cacheRoot)) {
    throw new Error("文件不在缓存目录内");
  }
  const relative = path.relative(cacheRoot, resolved);
  const segments = relative.split(path.sep).map((s) => encodeURIComponent(s));
  return `/api/serve/${segments.join("/")}`;
}

export function getCachePath() {
  ensureDir(DOWNLOAD_DIR);
  ensureDir(OUTPUT_DIR);
  return { download: DOWNLOAD_DIR, output: OUTPUT_DIR };
}
