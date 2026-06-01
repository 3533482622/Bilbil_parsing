import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { writeBlobFile, capPathFromRelative } from "./media-storage";
import { Filesystem, Directory } from "@capacitor/filesystem";

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (!loadPromise) {
    loadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => onLog?.(message));

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }

  return loadPromise;
}

function parseTimeToSeconds(t: string): number {
  const parts = t.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return Number(t) || 0;
}

async function readCapFile(capPath: string): Promise<Uint8Array> {
  const relative = capPath.replace(/^cap:\/\//, "");
  const { data } = await Filesystem.readFile({
    path: relative,
    directory: Directory.Data,
  });
  const base64 = typeof data === "string" ? data : await blobToBase64(data);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function clipMediaNative(
  capPath: string,
  start: string,
  end: string,
  format: "m4a" | "mp3" | "mp4",
  onProgress?: (msg: string) => void,
): Promise<{ outputPath: string; serveUrl: string }> {
  onProgress?.("正在加载 FFmpeg...");
  const ffmpeg = await getFfmpeg(onProgress);

  const inputData = await readCapFile(capPath);
  const inputName = "input.bin";
  const ext = capPath.split(".").pop() || "m4a";
  const inputFile = `input.${ext}`;
  await ffmpeg.writeFile(inputFile, inputData);

  const startSec = parseTimeToSeconds(start);
  const duration = Math.max(0.1, parseTimeToSeconds(end) - startSec);
  const outputName = `output.${format}`;

  const args = [
    "-ss",
    String(startSec),
    "-i",
    inputFile,
    "-t",
    String(duration),
  ];

  if (format === "mp3") {
    args.push("-c:a", "libmp3lame", "-b:a", "192k", outputName);
  } else if (format === "mp4") {
    args.push("-c", "copy", outputName);
  } else {
    args.push("-c", "copy", outputName);
  }

  onProgress?.("正在切片...");
  await ffmpeg.exec(args);

  const outData = await ffmpeg.readFile(outputName);
  const buffer =
    outData instanceof Uint8Array
      ? outData.buffer.slice(
          outData.byteOffset,
          outData.byteOffset + outData.byteLength,
        )
      : new TextEncoder().encode(outData as string).buffer;

  const startSafe = start.replace(/:/g, "m") + "s";
  const endSafe = end.replace(/:/g, "m") + "s";
  const fileName = `clip_${startSafe}-${endSafe}.${format}`;

  const saved = await writeBlobFile("output", fileName, buffer as ArrayBuffer);

  await ffmpeg.deleteFile(inputFile);
  await ffmpeg.deleteFile(outputName);

  return {
    outputPath: capPathFromRelative(saved.relativePath),
    serveUrl: saved.playUrl,
  };
}
