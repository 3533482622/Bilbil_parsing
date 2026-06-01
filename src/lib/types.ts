export type MediaKind = "audio" | "video";

export interface VideoPage {
  index: number;
  cid: string;
  title: string;
  duration: string;
}

export interface AudioStream {
  index: number;
  codec: string;
  bitrate: string;
  size: string;
}

export interface VideoStream {
  index: number;
  resolution: string;
  codec: string;
  fps: string;
  bitrate: string;
  size: string;
}

export interface RemotePreviewStream {
  mediaKind: MediaKind;
  url: string;
  quality: string;
}

export interface VideoInfo {
  title: string;
  cover: string;
  pages: VideoPage[];
  audios: AudioStream[];
  videos: VideoStream[];
  remotePreviews: RemotePreviewStream[];
}

export interface ParseResult {
  success: boolean;
  data?: VideoInfo;
  error?: string;
}

export interface DownloadProgress {
  type: "progress" | "done" | "error";
  percent?: number;
  message?: string;
  filePath?: string;
  serveUrl?: string;
  error?: string;
}

export interface ClipRequest {
  filePath: string;
  start: string; // HH:MM:SS
  end: string;   // HH:MM:SS
  format: "m4a" | "mp3" | "mp4";
}

export interface ClipResult {
  type: "done" | "error";
  outputPath?: string;
  serveUrl?: string;
  error?: string;
}

export interface MediaFileItem {
  name: string;
  path: string;
  serveUrl: string;
  size: number;
  mtimeMs: number;
  mediaKind: MediaKind;
  source: "download" | "output";
}

export type AppStep = "input" | "parsed" | "downloading" | "downloaded" | "clipping" | "clipped";
