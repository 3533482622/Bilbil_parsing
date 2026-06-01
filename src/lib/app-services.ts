import { isCapacitorNative } from "./platform";
import type { VideoInfo, MediaFileItem, MediaKind } from "./types";
import * as web from "./app-services-web";
import * as native from "./app-services-native";

function backend() {
  return isCapacitorNative() ? native : web;
}

export async function parseVideo(url: string): Promise<VideoInfo> {
  return backend().parseVideo(url);
}

export async function downloadMedia(
  url: string,
  mediaKind: MediaKind,
  page: number | undefined,
  onProgress: (message: string) => void,
): Promise<{ filePath: string; serveUrl: string }> {
  return backend().downloadMedia(url, mediaKind, page, onProgress);
}

export async function clipMedia(
  filePath: string,
  start: string,
  end: string,
  format: "m4a" | "mp3" | "mp4",
  onProgress?: (message: string) => void,
): Promise<{ outputPath: string; serveUrl: string }> {
  const impl = backend();
  if (isCapacitorNative()) {
    return native.clipMedia(filePath, start, end, format, onProgress);
  }
  return web.clipMedia(filePath, start, end, format);
}

export async function listMedia(): Promise<MediaFileItem[]> {
  return backend().listMedia();
}

export async function deleteMedia(path: string): Promise<void> {
  return backend().deleteMedia(path);
}
