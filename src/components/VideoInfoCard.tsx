"use client";

import { VideoInfo, MediaKind } from "@/lib/types";

interface VideoInfoCardProps {
  info: VideoInfo;
  selectedPage: number;
  onPageChange: (page: number) => void;
  mediaKind: MediaKind;
  onMediaKindChange: (kind: MediaKind) => void;
  onPreview: () => void;
  onDownload: () => void;
  downloading: boolean;
}

export default function VideoInfoCard({
  info,
  selectedPage,
  onPageChange,
  mediaKind,
  onMediaKindChange,
  onPreview,
  onDownload,
  downloading,
}: VideoInfoCardProps) {
  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 leading-snug">
          {info.title}
        </h2>

        {info.pages.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              选择分P
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-gray-100 dark:border-gray-700 rounded-lg">
              {info.pages.map((page) => (
                <button
                  key={page.index}
                  onClick={() => onPageChange(page.index)}
                  className={`px-2 py-1.5 sm:px-3 text-xs sm:text-sm rounded-lg border transition-colors min-h-[36px] sm:min-h-0 ${
                    selectedPage === page.index
                      ? "bg-pink-600 text-white border-pink-600"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-pink-400"
                  }`}
                >
                  P{page.index}: {page.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            媒体类型
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <button
              onClick={() => onMediaKindChange("audio")}
              className={`py-2.5 sm:py-2 rounded-lg border font-medium text-sm transition-colors min-h-[44px] sm:min-h-0 ${
                mediaKind === "audio"
                  ? "bg-pink-50 border-pink-600 text-pink-600 dark:bg-pink-950/20"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              }`}
            >
              音频 (M4A)
            </button>
            <button
              onClick={() => onMediaKindChange("video")}
              className={`py-2.5 sm:py-2 rounded-lg border font-medium text-sm transition-colors min-h-[44px] sm:min-h-0 ${
                mediaKind === "video"
                  ? "bg-pink-50 border-pink-600 text-pink-600 dark:bg-pink-950/20"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              }`}
            >
              视频 (MP4)
            </button>
          </div>
        </div>

        <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
          {mediaKind === "video" && info.videos.length > 0 && (
            <div>
              <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">可用视频流：</p>
              <ul className="list-disc list-inside space-y-0.5 break-all">
                {info.videos.slice(0, 3).map((v) => (
                  <li key={v.index}>
                    {v.resolution} | {v.codec} | {v.fps}fps | {v.bitrate} ({v.size})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mediaKind === "audio" && info.audios.length > 0 && (
            <div>
              <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">可用音频流：</p>
              <ul className="list-disc list-inside space-y-0.5">
                {info.audios.slice(0, 3).map((a) => (
                  <li key={a.index}>
                    {a.codec} | {a.bitrate} ({a.size})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onDownload}
            disabled={downloading}
            className="w-full py-3 rounded-lg font-medium text-sm text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {downloading ? "正在下载..." : `下载本地缓存 (${mediaKind === "video" ? "视频" : "音频"})`}
          </button>

          {mediaKind === "video" && (
            <button
              onClick={onPreview}
              disabled={downloading}
              className="w-full py-3 rounded-lg font-medium text-sm border border-pink-600 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/10 transition-colors min-h-[44px]"
            >
              远程免下载预览视频
            </button>
          )}

          {mediaKind === "audio" && info.remotePreviews.some((p) => p.mediaKind === "audio") && (
            <button
              onClick={onPreview}
              disabled={downloading}
              className="w-full py-3 rounded-lg font-medium text-sm border border-pink-600 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/10 transition-colors min-h-[44px]"
            >
              远程免下载预览音频
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
