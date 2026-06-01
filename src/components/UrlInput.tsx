"use client";

import { useState } from "react";

interface UrlInputProps {
  onParse: (url: string) => void;
  loading: boolean;
}

export default function UrlInput({ onParse, loading }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onParse(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="输入B站视频链接（支持 ep/ss/BV/av 格式）"
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base min-h-[44px] sm:min-h-0"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap min-h-[44px] sm:min-h-0"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              解析中
            </span>
          ) : (
            "解析"
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 break-all">
        示例：https://www.bilibili.com/bangumi/play/ep3915324 或 BV1xx411c7mD
      </p>
    </form>
  );
}
