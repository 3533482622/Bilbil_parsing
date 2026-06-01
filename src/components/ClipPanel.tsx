"use client";

import { MediaKind } from "@/lib/types";

interface ClipPanelProps {
  onClip: (format: "m4a" | "mp3" | "mp4") => void;
  clipping: boolean;
  disabled: boolean;
  mediaKind: MediaKind;
  clipResult?: { outputPath: string; serveUrl: string } | null;
}

export default function ClipPanel({
  onClip,
  clipping,
  disabled,
  mediaKind,
  clipResult,
}: ClipPanelProps) {
  const fileName = clipResult?.outputPath
    ? clipResult.outputPath.split(/[\\/]/).pop()
    : null;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        导出切片
      </h3>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {mediaKind === "audio" ? (
          <>
            <button
              onClick={() => onClip("m4a")}
              disabled={disabled || clipping}
              className="flex-1 py-3 sm:py-2.5 rounded-lg font-medium text-sm text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] sm:min-h-0"
            >
              {clipping ? "切片中..." : "导出 M4A (无损)"}
            </button>
            <button
              onClick={() => onClip("mp3")}
              disabled={disabled || clipping}
              className="flex-1 py-3 sm:py-2.5 rounded-lg font-medium text-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] sm:min-h-0"
            >
              {clipping ? "切片中..." : "导出 MP3 (192kbps)"}
            </button>
          </>
        ) : (
          <button
            onClick={() => onClip("mp4")}
            disabled={disabled || clipping}
            className="flex-1 py-3 sm:py-2.5 rounded-lg font-medium text-sm text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] sm:min-h-0"
          >
            {clipping ? "视频切片中..." : "导出 MP4 (无损复制)"}
          </button>
        )}
      </div>

      {clipResult?.outputPath && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400 mb-2">切片完成！</p>
          {clipResult.serveUrl && (
            <a
              href={clipResult.serveUrl}
              download={fileName || undefined}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400 break-all"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载 {fileName}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
