import type {
  VideoInfo,
  VideoPage,
  AudioStream,
  VideoStream,
  RemotePreviewStream,
  MediaKind,
} from "../types";
import { writeBlobFile } from "./media-storage";

const BILI_HEADERS: Record<string, string> = {
  Referer: "https://www.bilibili.com",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
};

async function biliFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: BILI_HEADERS });
  const json = (await res.json()) as {
    code: number;
    message?: string;
    data?: T;
    result?: T;
  };
  if (json.code !== 0) {
    throw new Error(json.message || `B站 API 错误 code=${json.code}`);
  }
  const payload = json.data ?? json.result;
  if (payload === undefined) {
    throw new Error("B站 API 返回空数据");
  }
  return payload as T;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 从链接解析 bvid 与分 P 序号 */
export async function resolveBvidAndPage(
  inputUrl: string,
): Promise<{ bvid: string; page: number; aid?: number }> {
  let url = inputUrl.trim();
  if (!url.startsWith("http")) {
    if (/^BV/i.test(url)) url = `https://www.bilibili.com/video/${url}`;
    else if (/^av\d+/i.test(url))
      url = `https://www.bilibili.com/video/${url}`;
    else if (/^ep\d+/i.test(url))
      url = `https://www.bilibili.com/bangumi/play/${url}`;
    else if (/^ss\d+/i.test(url))
      url = `https://www.bilibili.com/bangumi/play/${url}`;
  }

  const bvMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+)/i);
  if (bvMatch) {
    const pageMatch = url.match(/[?&]p=(\d+)/);
    return { bvid: bvMatch[1], page: pageMatch ? parseInt(pageMatch[1], 10) : 1 };
  }

  const avMatch = url.match(/\/video\/av(\d+)/i) || url.match(/^av(\d+)$/i);
  if (avMatch) {
    const aid = parseInt(avMatch[1], 10);
    const view = await biliFetch<ViewData>(
      `https://api.bilibili.com/x/web-interface/view?aid=${aid}`,
    );
    return { bvid: view.bvid, page: 1, aid };
  }

  const epMatch = url.match(/\/ep(\d+)/i) || url.match(/^ep(\d+)$/i);
  if (epMatch) {
    const epId = epMatch[1];
    const season = await biliFetch<{
      episodes: { id: number; bvid: string; aid: number; title: string }[];
      title: string;
    }>(`https://api.bilibili.com/pgc/view/web/season?ep_id=${epId}`);
    const ep = season.episodes?.find((e) => String(e.id) === epId);
    if (ep?.bvid) return { bvid: ep.bvid, page: 1, aid: ep.aid };
    throw new Error("无法解析番剧 ep 链接");
  }

  throw new Error("无法识别 B 站链接，请使用 BV/av/ep 链接");
}

interface ViewData {
  bvid: string;
  aid: number;
  title: string;
  pic: string;
  pages: { cid: number; page: number; part: string; duration: number }[];
}

export async function parseBilibiliVideoNative(url: string): Promise<VideoInfo> {
  const { bvid, page: pageNum } = await resolveBvidAndPage(url);
  const view = await biliFetch<ViewData>(
    `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
  );

  const pages: VideoPage[] = view.pages.map((p) => ({
    index: p.page,
    cid: String(p.cid),
    title: p.part || `P${p.page}`,
    duration: formatDuration(p.duration),
  }));

  const currentPage = view.pages.find((p) => p.page === pageNum) || view.pages[0];
  const cid = currentPage.cid;

  const playurl = await biliFetch<{
    dash?: {
      audio?: { id: number; baseUrl: string; bandwidth: number; codecs: string }[];
      video?: {
        id: number;
        baseUrl: string;
        bandwidth: number;
        codecs: string;
        width: number;
        height: number;
        frameRate: string;
      }[];
    };
    durl?: { url: string; size: number }[];
  }>(
    `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&fnval=16&fourk=1`,
  );

  const audios: AudioStream[] = (playurl.dash?.audio || []).map((a, i) => ({
    index: i,
    codec: a.codecs?.split(".")[0]?.toUpperCase() || "AAC",
    bitrate: `${Math.round(a.bandwidth / 1000)} kbps`,
    size: "—",
  }));

  const videos: VideoStream[] = (playurl.dash?.video || []).map((v, i) => ({
    index: i,
    resolution: `${v.width}x${v.height}`,
    codec: v.codecs?.split(".")[0]?.toUpperCase() || "AVC",
    fps: v.frameRate || "30",
    bitrate: `${Math.round(v.bandwidth / 1000)} kbps`,
    size: "—",
  }));

  const remotePreviews: RemotePreviewStream[] = [];
  const bestAudio = playurl.dash?.audio?.[0];
  const bestVideo = playurl.dash?.video?.[0];
  if (bestAudio?.baseUrl) {
    remotePreviews.push({
      mediaKind: "audio",
      url: bestAudio.baseUrl,
      quality: "DASH 音频预览",
    });
  }
  if (bestVideo?.baseUrl) {
    remotePreviews.push({
      mediaKind: "video",
      url: bestVideo.baseUrl,
      quality: "DASH 视频预览",
    });
  }

  if (audios.length === 0 && playurl.durl?.[0]) {
    remotePreviews.push({
      mediaKind: "audio",
      url: playurl.durl[0].url,
      quality: "MP4 流预览",
    });
  }

  return {
    title: view.title,
    cover: view.pic,
    pages,
    audios,
    videos,
    remotePreviews,
  };
}

async function downloadUrlToBuffer(
  url: string,
  onProgress: (msg: string) => void,
): Promise<ArrayBuffer> {
  onProgress("正在连接下载...");
  const res = await fetch(url, { headers: BILI_HEADERS });
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);

  const total = Number(res.headers.get("content-length") || 0);
  const reader = res.body?.getReader();
  if (!reader) {
    return res.arrayBuffer();
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) {
      onProgress(`下载进度: ${((received / total) * 100).toFixed(1)}%`);
    } else {
      onProgress(`已下载 ${(received / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return merged.buffer;
}

export async function downloadBilibiliMediaNative(
  url: string,
  mediaKind: MediaKind,
  onProgress: (msg: string) => void,
  page?: number,
): Promise<{ filePath: string; serveUrl: string }> {
  const { bvid, page: defaultPage } = await resolveBvidAndPage(url);
  const pageNum = page ?? defaultPage;

  onProgress("正在获取播放地址...");
  const view = await biliFetch<ViewData>(
    `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
  );
  const currentPage = view.pages.find((p) => p.page === pageNum) || view.pages[0];
  const cid = currentPage.cid;

  const playurl = await biliFetch<{
    dash?: {
      audio?: { baseUrl: string; id: number }[];
      video?: { baseUrl: string; id: number }[];
    };
    durl?: { url: string }[];
  }>(
    `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&fnval=16&fourk=1`,
  );

  let streamUrl: string | undefined;
  let ext = "m4a";

  if (mediaKind === "audio") {
    streamUrl =
      playurl.dash?.audio?.[0]?.baseUrl || playurl.durl?.[0]?.url;
    ext = "m4a";
  } else {
    streamUrl =
      playurl.dash?.video?.[0]?.baseUrl || playurl.durl?.[0]?.url;
    ext = "mp4";
  }

  if (!streamUrl) {
    throw new Error("未获取到可下载的媒体流，请尝试登录或更换分P");
  }

  const buffer = await downloadUrlToBuffer(streamUrl, onProgress);
  const safeTitle = view.title.replace(/[<>:"/\\|?*]/g, "_").slice(0, 40);
  const fileName = `${safeTitle}_P${pageNum}.${ext}`;

  onProgress("正在保存到本地...");
  const saved = await writeBlobFile("download", fileName, buffer);

  return {
    filePath: saved.absLabel,
    serveUrl: saved.playUrl,
  };
}
