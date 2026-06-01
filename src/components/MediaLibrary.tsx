"use client";

import { MediaFileItem } from "@/lib/types";

interface MediaLibraryProps {
  files: MediaFileItem[];
  onLoadFile: (file: MediaFileItem) => void;
  onDeleteFile: (file: MediaFileItem) => void;
  currentFilePath?: string;
}

export default function MediaLibrary({
  files,
  onLoadFile,
  onDeleteFile,
  currentFilePath,
}: MediaLibraryProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (mtimeMs: number) => {
    return new Date(mtimeMs).toLocaleString("zh-CN", {
      hour12: false,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-pink-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          已下载资源库 ({files.length})
        </h3>
        <span className="text-xs text-gray-500">管理本地缓存与剪辑产物</span>
      </div>

      {files.length === 0 ? (
        <div className="p-6 sm:p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          暂无已下载的音视频资源，请在上方输入链接解析并下载。
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
          {files.map((file) => {
            const isCurrent = currentFilePath === file.path;
            return (
              <div
                key={file.path}
                className={`p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  isCurrent ? "bg-pink-50/40 dark:bg-pink-950/20" : ""
                }`}
              >
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        file.mediaKind === "video"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {file.mediaKind === "video" ? "视频" : "音频"}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        file.source === "output"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {file.source === "output" ? "剪辑产物" : "原始下载"}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{formatSize(file.size)}</span>
                  </div>
                  <h4
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all sm:truncate"
                    title={file.name}
                  >
                    {file.name}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">修改时间: {formatDate(file.mtimeMs)}</p>
                </div>

                <div className="flex items-center justify-end sm:justify-start gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => onLoadFile(file)}
                    className={`flex-1 sm:flex-none px-3 py-2.5 sm:py-1.5 text-xs font-medium rounded-lg border transition-colors min-h-[44px] sm:min-h-0 ${
                      isCurrent
                        ? "bg-pink-600 text-white border-pink-600"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-pink-400"
                    }`}
                  >
                    {isCurrent ? "正在播放" : "载入播放"}
                  </button>

                  <a
                    href={file.serveUrl}
                    download={file.name}
                    className="p-2.5 sm:p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    title="下载到本地"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>

                  <button
                    onClick={() => onDeleteFile(file)}
                    className="p-2.5 sm:p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent rounded-lg min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    title="删除缓存"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
