import type { VideoInfo, MediaFileItem, MediaKind } from "./types";
import {
  parseBilibiliVideoNative,
  downloadBilibiliMediaNative,
} from "./native/bilibili-client";
import { clipMediaNative } from "./native/ffmpeg-clip";
import {
  listNativeMediaFiles,
  deleteNativeMediaFile,
} from "./native/media-storage";

export async function parseVideo(url: string): Promise<VideoInfo> {
  return parseBilibiliVideoNative(url);
}

export async function downloadMedia(
  url: string,
  mediaKind: MediaKind,
  page: number | undefined,
  onProgress: (message: string) => void,
): Promise<{ filePath: string; serveUrl: string }> {
  return downloadBilibiliMediaNative(url, mediaKind, onProgress, page);
}

export async function clipMedia(
  filePath: string,
  start: string,
  end: string,
  format: "m4a" | "mp3" | "mp4",
  onProgress?: (message: string) => void,
): Promise<{ outputPath: string; serveUrl: string }> {
  return clipMediaNative(filePath, start, end, format, onProgress);
}

export async function listMedia(): Promise<MediaFileItem[]> {
  return listNativeMediaFiles();
}

export async function deleteMedia(path: string): Promise<void> {
  return deleteNativeMediaFile(path);
}
