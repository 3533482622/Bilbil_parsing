import path from "path";
import { execFile, spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import fs from "fs";
import iconv from "iconv-lite";
import { MediaKind, MediaFileItem, VideoPage, AudioStream, VideoStream, RemotePreviewStream } from "./types";
import { absolutePathToServeUrl, CACHE_DIR, DOWNLOAD_DIR, ensureDir, OUTPUT_DIR } from "./cache-paths";

export { CACHE_DIR, getCachePath } from "./cache-paths";

const execFileAsync = promisify(execFile);

const isWindows = process.platform === "win32";
const LOCAL_TOOLS_DIRS = [
  path.join(process.cwd(), "tools"),
  path.join(process.cwd(), "redio", "tools"),
  ...(process.env.NODE_ENV === "production"
    ? []
    : [path.resolve(process.cwd(), "..", "redio", "tools")]),
];

function resolveToolPath(envName: string, localNames: string[], fallbackCommand: string) {
  const envValue = process.env[envName];
  if (envValue) {
    return path.isAbsolute(envValue) ? envValue : path.resolve(/*turbopackIgnore: true*/ process.cwd(), envValue);
  }

  for (const name of localNames) {
    for (const dir of LOCAL_TOOLS_DIRS) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return isWindows ? path.join(LOCAL_TOOLS_DIRS[0], localNames[0]) : fallbackCommand;
}

function formatToolLaunchError(toolName: string, toolPath: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const code = typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";

  if (code === "ENOENT") {
    return `${toolName} 不存在或无法在服务器中找到：${toolPath}。本地 Windows 可使用 tools 或 redio/tools 下的 .exe；Netlify/Linux 需要安装对应 Linux 可执行文件，并通过 ${toolName.toUpperCase()}_PATH 环境变量指定，或确保命令在 PATH 中可用。`;
  }

  if (code === "EACCES") {
    return `${toolName} 没有执行权限：${toolPath}。请给服务器上的可执行文件添加执行权限。`;
  }

  return `${toolName} 执行失败：${message}`;
}

const BBDOWN = resolveToolPath("BBDOWN_PATH", ["BBDown.exe", "BBDown"], "BBDown");
const FFMPEG = resolveToolPath("FFMPEG_PATH", ["ffmpeg.exe", "ffmpeg"], "ffmpeg");
const FFPROBE = resolveToolPath("FFPROBE_PATH", ["ffprobe.exe", "ffprobe"], "ffprobe");

/** BBDown 在 Windows 上可能输出 UTF-8 或 GBK，自动检测 */
function decodeBbdownOutput(stdout: Buffer, stderr: Buffer): string {
  const buf = Buffer.concat([stdout, stderr]);
  if (buf.length === 0) return "";

  const utf8 = buf.toString("utf8");
  const hasChinese = /[\u4e00-\u9fff]/.test(utf8);
  const hasReplacement = utf8.includes("\uFFFD");

  if (hasChinese && !hasReplacement) {
    return utf8;
  }

  try {
    const gbk = iconv.decode(buf, "gbk");
    if (/[\u4e00-\u9fff]/.test(gbk)) return gbk;
  } catch {
    /* ignore */
  }

  return utf8;
}

export function getToolsPath() {
  return { bbdown: BBDOWN, ffmpeg: FFMPEG, ffprobe: FFPROBE };
}

async function runBbdown(args: string[], timeoutMs = 120000): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(BBDOWN, args, {
      timeout: timeoutMs,
      encoding: "buffer",
      maxBuffer: 20 * 1024 * 1024,
    });
    return decodeBbdownOutput(stdout as Buffer, stderr as Buffer);
  } catch (err) {
    throw new Error(formatToolLaunchError("BBDown", BBDOWN, err));
  }
}

/**
 * 调用 BBDown --only-show-info 解析视频元数据
 */
export async function parseBilibiliVideo(url: string) {
  ensureDir(DOWNLOAD_DIR);

  const output = await runBbdown(
    [url, "--only-show-info", "--work-dir", DOWNLOAD_DIR],
    60000,
  );

  const titleMatch = output.match(/视频标题:\s*(.+?)(?:\r?\n|$)/);
  const title = titleMatch ? titleMatch[1].trim() : "未知标题";

  const pageRegex =
    /P(\d+):\s*\[(\d+)\]\s*\[([^\]]*)\]\s*\[(\d+m\d+s|\d+:\d+:\d+|\d+:\d+|00m00s)\]/g;
  const pages: VideoPage[] = [];
  let match;
  while ((match = pageRegex.exec(output)) !== null) {
    pages.push({
      index: parseInt(match[1], 10),
      cid: match[2],
      title: match[3],
      duration: match[4],
    });
  }

  // 解析视频流
  // 格式如: 0. [1080P 高码率] [1920x1080] [AVC] [30.000] [3123 kbps] [~300.00 MB]
  const videoRegex = /(\d+)\.\s*\[([^\]]+)\]\s*\[(\d+x\d+)\]\s*\[(AVC|HEVC|AV1)\]\s*\[([\d\.]+)\]\s*\[(\d+)\s*kbps\]\s*\[([^\]]+)\]/g;
  const videos: VideoStream[] = [];
  while ((match = videoRegex.exec(output)) !== null) {
    videos.push({
      index: parseInt(match[1], 10),
      resolution: match[2] + " (" + match[3] + ")",
      codec: match[4],
      fps: match[5],
      bitrate: match[6] + " kbps",
      size: match[7],
    });
  }

  // 解析音频流
  const audioRegex = /(\d+)\.\s*\[(M4A|AAC)\]\s*\[(\d+)\s*kbps\]\s*\[([^\]]+)\]/g;
  const audios: AudioStream[] = [];
  while ((match = audioRegex.exec(output)) !== null) {
    audios.push({
      index: parseInt(match[1], 10),
      codec: match[2],
      bitrate: match[3] + " kbps",
      size: match[4],
    });
  }

  // 解析临时直链用于远程预览
  const remotePreviews: RemotePreviewStream[] = [];
  // 匹配视频流链接
  const videoUrlRegex = /\[视频\]\s*\[[^\]]+\]\s*\[[^\]]+\]\s*\[[^\]]+\]\s*\r?\n(https?:\/\/[^\s]+)/g;
  let urlMatch;
  while ((urlMatch = videoUrlRegex.exec(output)) !== null) {
    remotePreviews.push({
      mediaKind: "video",
      url: urlMatch[1],
      quality: "视频流预览",
    });
  }

  // 匹配音频流链接
  const audioUrlRegex = /\[音频\]\s*\[[^\]]+\]\s*\[[^\]]+\]\s*\r?\n(https?:\/\/[^\s]+)/g;
  while ((urlMatch = audioUrlRegex.exec(output)) !== null) {
    remotePreviews.push({
      mediaKind: "audio",
      url: urlMatch[1],
      quality: "音频流预览",
    });
  }

  return { title, cover: "", pages, audios, videos, remotePreviews };
}

/**
 * 调用 BBDown 下载音频或视频，返回子进程用于流式输出
 */
export function downloadBilibiliMedia(
  url: string,
  mediaKind: MediaKind,
  onProgress: (msg: string) => void,
  onDone: (filePath: string, serveUrl: string) => void,
  onError: (err: string) => void,
  page?: number,
): ChildProcess {
  ensureDir(DOWNLOAD_DIR);

  const args = ["--work-dir", DOWNLOAD_DIR];
  if (mediaKind === "audio") {
    args.push("--audio-only");
  }
  args.push(url);
  if (page !== undefined) {
    args.push("-p", String(page));
  }

  const proc = spawn(BBDOWN, args);
  let stderrBuf = Buffer.alloc(0);
  let stdoutBuf = Buffer.alloc(0);

  const flushProgress = (buf: Buffer) => {
    const text = decodeBbdownOutput(buf, Buffer.alloc(0));
    const pctMatch = text.match(/(\d+\.?\d*)%/);
    if (pctMatch) {
      onProgress(`下载进度: ${pctMatch[1]}%`);
    } else {
      const line = text.split(/\r?\n/).filter(Boolean).pop();
      if (line) onProgress(line);
    }
  };

  proc.stdout.on("data", (data: Buffer) => {
    stdoutBuf = Buffer.concat([stdoutBuf, data]);
    flushProgress(data);
  });

  proc.stderr.on("data", (data: Buffer) => {
    stderrBuf = Buffer.concat([stderrBuf, data]);
    flushProgress(data);
  });

  proc.on("close", (code) => {
    if (code === 0) {
      const files = mediaKind === "audio" ? findAudioFiles(DOWNLOAD_DIR) : findVideoFiles(DOWNLOAD_DIR);
      if (files.length > 0) {
        const latest = files.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
        try {
          const serveUrl = absolutePathToServeUrl(latest.path);
          onDone(latest.path, serveUrl);
        } catch (e) {
          onError(e instanceof Error ? e.message : "生成播放地址失败");
        }
      } else {
        const hint = decodeBbdownOutput(stdoutBuf, stderrBuf).slice(-500);
        onError(`下载完成但未找到相关媒体文件。${hint ? `日志: ${hint}` : ""}`);
      }
    } else {
      const hint = decodeBbdownOutput(stdoutBuf, stderrBuf).slice(-300);
      onError(`BBDown 退出码: ${code}${hint ? ` — ${hint}` : ""}`);
    }
  });

  proc.on("error", (err) => {
    onError(formatToolLaunchError("BBDown", BBDOWN, err));
  });

  return proc;
}

/**
 * 兼容旧版的 downloadBilibiliAudio
 */
export function downloadBilibiliAudio(
  url: string,
  onProgress: (msg: string) => void,
  onDone: (filePath: string, serveUrl: string) => void,
  onError: (err: string) => void,
  page?: number,
): ChildProcess {
  return downloadBilibiliMedia(url, "audio", onProgress, onDone, onError, page);
}

/**
 * 调用 FFmpeg 切片音频或视频
 */
export async function clipMedia(
  inputPath: string,
  start: string,
  end: string,
  format: "m4a" | "mp3" | "mp4",
): Promise<{ outputPath: string; serveUrl: string }> {
  ensureDir(OUTPUT_DIR);

  const startSafe = start.replace(/:/g, "m") + "s";
  const endSafe = end.replace(/:/g, "m") + "s";
  const outputName = `clip_${startSafe}-${endSafe}.${format}`;
  const outputPath = path.join(OUTPUT_DIR, outputName);

  const args: string[] = ["-ss", start, "-to", end, "-i", inputPath];

  if (format === "m4a" || format === "mp4") {
    args.push("-c", "copy", "-y", outputPath);
  } else {
    args.push("-c:a", "libmp3lame", "-b:a", "192k", "-y", outputPath);
  }

  try {
    await execFileAsync(FFMPEG, args, {
      timeout: 120000,
      encoding: "buffer",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    throw new Error(formatToolLaunchError("FFmpeg", FFMPEG, err));
  }

  return {
    outputPath,
    serveUrl: absolutePathToServeUrl(outputPath),
  };
}

/**
 * 兼容旧版的 clipAudio
 */
export async function clipAudio(
  inputPath: string,
  start: string,
  end: string,
  format: "m4a" | "mp3",
): Promise<{ outputPath: string; serveUrl: string }> {
  return clipMedia(inputPath, start, end, format);
}

/**
 * 调用 ffprobe 获取媒体时长
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  let stdout: string;
  try {
    const result = await execFileAsync(
      FFPROBE,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { timeout: 10000, encoding: "utf-8" },
    );
    stdout = result.stdout;
  } catch (err) {
    throw new Error(formatToolLaunchError("FFprobe", FFPROBE, err));
  }

  return parseFloat(stdout.trim());
}

/**
 * 扫描缓存文件列表
 */
export function listMediaFiles(): MediaFileItem[] {
  ensureDir(DOWNLOAD_DIR);
  ensureDir(OUTPUT_DIR);

  const items: MediaFileItem[] = [];

  const scan = (dir: string, source: "download" | "output") => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath, source);
      } else {
        const isAudio = /\.(m4a|aac|mp3|flac|wav|ogg)$/i.test(entry.name);
        const isVideo = /\.(mp4|mkv|avi|mov|flv|webm)$/i.test(entry.name);
        if (isAudio || isVideo) {
          const stat = fs.statSync(fullPath);
          items.push({
            name: entry.name,
            path: fullPath,
            serveUrl: absolutePathToServeUrl(fullPath),
            size: stat.size,
            mtimeMs: stat.mtimeMs,
            mediaKind: isVideo ? "video" : "audio",
            source,
          });
        }
      }
    }
  };

  scan(DOWNLOAD_DIR, "download");
  scan(OUTPUT_DIR, "output");

  return items.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/**
 * 安全删除缓存文件
 */
export function deleteMediaFile(absPath: string) {
  const resolved = path.resolve(absPath);
  const cacheRoot = path.resolve(CACHE_DIR);
  if (!resolved.startsWith(cacheRoot)) {
    throw new Error("无权删除非缓存目录内的文件");
  }
  if (fs.existsSync(resolved)) {
    fs.unlinkSync(resolved);
  }
}

function findAudioFiles(dir: string): { path: string; mtimeMs: number }[] {
  const results: { path: string; mtimeMs: number }[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAudioFiles(fullPath));
    } else if (/\.(m4a|aac|mp3|flac|wav|ogg)$/i.test(entry.name)) {
      const stat = fs.statSync(fullPath);
      results.push({ path: fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  return results;
}

function findVideoFiles(dir: string): { path: string; mtimeMs: number }[] {
  const results: { path: string; mtimeMs: number }[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findVideoFiles(fullPath));
    } else if (/\.(mp4|mkv|avi|mov|flv|webm)$/i.test(entry.name)) {
      const stat = fs.statSync(fullPath);
      results.push({ path: fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  return results;
}
