import type { VideoInfo, MediaFileItem, MediaKind } from "./types";

const API = {
  parse: "/api/bilibili/parse",
  download: "/api/bilibili/download",
  clip: "/api/clip",
  media: "/api/media",
};

export async function parseVideo(url: string): Promise<VideoInfo> {
  const res = await fetch(API.parse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "解析失败");
  }
  return data.data as VideoInfo;
}

export async function downloadMedia(
  url: string,
  mediaKind: MediaKind,
  page: number | undefined,
  onProgress: (message: string) => void,
): Promise<{ filePath: string; serveUrl: string }> {
  const res = await fetch(API.download, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, page, mediaKind }),
  });

  const reader = res.body?.getReader();
  if (!reader) throw new Error("无法读取下载流");

  const decoder = new TextDecoder();
  let buffer = "";
  let filePath = "";
  let serveUrl = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as {
          type: string;
          message?: string;
          filePath?: string;
          serveUrl?: string;
          error?: string;
        };
        if (event.type === "progress" && event.message) {
          onProgress(event.message);
        } else if (event.type === "done") {
          filePath = event.filePath || "";
          serveUrl = event.serveUrl || "";
        } else if (event.type === "error") {
          throw new Error(event.error || "下载失败");
        }
      } catch (e) {
        if (e instanceof Error && e.message !== "下载失败") throw e;
      }
    }
  }

  if (!filePath || !serveUrl) {
    throw new Error("下载完成但未找到文件");
  }
  return { filePath, serveUrl };
}

export async function clipMedia(
  filePath: string,
  start: string,
  end: string,
  format: "m4a" | "mp3" | "mp4",
): Promise<{ outputPath: string; serveUrl: string }> {
  const res = await fetch(API.clip, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filePath, start, end, format }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "切片失败");
  }
  return { outputPath: data.outputPath, serveUrl: data.serveUrl };
}

export async function listMedia(): Promise<MediaFileItem[]> {
  const res = await fetch(API.media);
  const data = await res.json();
  if (!data.success) return [];
  return data.data as MediaFileItem[];
}

export async function deleteMedia(path: string): Promise<void> {
  const res = await fetch(API.media, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "删除失败");
  }
}
