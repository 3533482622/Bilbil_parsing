import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import type { MediaFileItem, MediaKind } from "../types";

const DOWNLOAD_SUB = "download";
const OUTPUT_SUB = "output";

const AUDIO_EXT = /\.(m4a|aac|mp3|flac|wav|ogg)$/i;
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|flv|webm)$/i;

async function ensureDir(sub: string): Promise<string> {
  const path = `bili-cache/${sub}`;
  try {
    await Filesystem.mkdir({
      path,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    /* already exists */
  }
  return path;
}

export async function getDownloadDir(): Promise<string> {
  return ensureDir(DOWNLOAD_SUB);
}

export async function getOutputDir(): Promise<string> {
  return ensureDir(OUTPUT_SUB);
}

/** 使用 Filesystem.getUri 获取可播放地址 */
export async function resolvePlayUrl(
  directory: Directory,
  relativePath: string,
): Promise<string> {
  const { uri } = await Filesystem.getUri({
    path: relativePath,
    directory,
  });
  return Capacitor.convertFileSrc(uri);
}

export async function writeBlobFile(
  sub: "download" | "output",
  fileName: string,
  data: ArrayBuffer,
): Promise<{ relativePath: string; playUrl: string; absLabel: string }> {
  const base = sub === "download" ? await getDownloadDir() : await getOutputDir();
  const relativePath = `${base}/${fileName}`;
  const base64 = arrayBufferToBase64(data);

  await Filesystem.writeFile({
    path: relativePath,
    data: base64,
    directory: Directory.Data,
  });

  const playUrl = await resolvePlayUrl(Directory.Data, relativePath);
  return {
    relativePath,
    playUrl,
    absLabel: `cap://${relativePath}`,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function listDirRecursive(
  dirPath: string,
  source: "download" | "output",
): Promise<MediaFileItem[]> {
  const items: MediaFileItem[] = [];
  try {
    const listing = await Filesystem.readdir({
      path: dirPath,
      directory: Directory.Data,
    });

    for (const entry of listing.files) {
      const fullPath = `${dirPath}/${entry.name}`;
      const isDir =
        entry.type === "directory" ||
        (!entry.name.includes(".") && entry.type !== "file");
      if (isDir) {
        const nested = await listDirRecursive(fullPath, source);
        items.push(...nested);
        continue;
      }

      const isAudio = AUDIO_EXT.test(entry.name);
      const isVideo = VIDEO_EXT.test(entry.name);
      if (!isAudio && !isVideo) continue;

      const stat = await Filesystem.stat({
        path: fullPath,
        directory: Directory.Data,
      });

      const playUrl = await resolvePlayUrl(Directory.Data, fullPath);
      items.push({
        name: entry.name,
        path: `cap://${fullPath}`,
        serveUrl: playUrl,
        size: stat.size,
        mtimeMs: stat.mtime,
        mediaKind: (isVideo ? "video" : "audio") as MediaKind,
        source,
      });
    }
  } catch {
    /* empty dir */
  }
  return items;
}

export async function listNativeMediaFiles(): Promise<MediaFileItem[]> {
  const downloadDir = await getDownloadDir();
  const outputDir = await getOutputDir();
  const [d1, d2] = await Promise.all([
    listDirRecursive(downloadDir, "download"),
    listDirRecursive(outputDir, "output"),
  ]);
  return [...d1, ...d2].sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export async function deleteNativeMediaFile(capPath: string): Promise<void> {
  const relative = capPath.replace(/^cap:\/\//, "");
  if (!relative.startsWith("bili-cache/")) {
    throw new Error("无权删除非缓存目录内的文件");
  }
  await Filesystem.deleteFile({
    path: relative,
    directory: Directory.Data,
  });
}

export function capPathFromRelative(relativePath: string): string {
  return `cap://${relativePath}`;
}
