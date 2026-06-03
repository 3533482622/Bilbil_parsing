"use client";

import { useState, useCallback, useEffect } from "react";
import UrlInput from "@/components/UrlInput";
import VideoInfoCard from "@/components/VideoInfoCard";
import MediaPlayer from "@/components/MediaPlayer";
import TimelineEditor from "@/components/TimelineEditor";
import ClipPanel from "@/components/ClipPanel";
import ProgressIndicator from "@/components/ProgressIndicator";
import MediaLibrary from "@/components/MediaLibrary";
import { VideoInfo, AppStep, MediaKind, MediaFileItem } from "@/lib/types";
import * as appServices from "@/lib/app-services";
import { isCapacitorNative } from "@/lib/platform";

export default function Home() {
  const [step, setStep] = useState<AppStep>("input");
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [mediaKind, setMediaKind] = useState<MediaKind>("audio");

  const [mediaSrc, setMediaSrc] = useState("");
  const [mediaFilePath, setAudioFilePath] = useState("");
  const [mediaDuration, setMediaDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const [progressMsg, setProgressMsg] = useState("");
  const [clipping, setClipping] = useState(false);
  const [clipResult, setClipResult] = useState<{ outputPath: string; serveUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [libraryFiles, setLibraryFiles] = useState<MediaFileItem[]>([]);

  const fetchLibrary = useCallback(async () => {
    try {
      const files = await appServices.listMedia();
      setLibraryFiles(files);
    } catch {
      // 忽略列表拉取错误
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void appServices.listMedia()
      .then((files) => {
        if (!cancelled) setLibraryFiles(files);
      })
      .catch(() => {
        // 忽略列表拉取错误
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleParse = useCallback(async (inputUrl: string) => {
    setUrl(inputUrl);
    setStep("parsed" as AppStep);
    setError("");
    setVideoInfo(null);
    setSelectedPage(1);

    try {
      const info = await appServices.parseVideo(inputUrl);
      setVideoInfo(info);
      const firstPage = info.pages[0]?.index ?? 1;
      setSelectedPage((prev) => (info.pages.some((p) => p.index === prev) ? prev : firstPage));
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败");
      setStep("input");
    }
  }, []);

  const handlePreview = useCallback(() => {
    if (!videoInfo) return;
    const previewStream = videoInfo.remotePreviews.find((p) => p.mediaKind === mediaKind);
    if (previewStream) {
      setAudioFilePath("");
      setMediaSrc(previewStream.url);
      setStep("downloaded" as AppStep);
      setClipResult(null);
      setError("");
    } else {
      setError("不支持远程预览");
    }
  }, [videoInfo, mediaKind]);

  const handleDownload = useCallback(async () => {
    if (!url) return;
    if (videoInfo && !videoInfo.pages.some((p) => p.index === selectedPage)) {
      setError(`当前视频仅有 ${videoInfo.pages.length} 个分P，请重新选择分P`);
      setSelectedPage(videoInfo.pages[0]?.index ?? 1);
      return;
    }
    setStep("downloading");
    setError("");
    setProgressMsg("正在启动下载...");

    try {
      const { filePath, serveUrl } = await appServices.downloadMedia(
        url,
        mediaKind,
        selectedPage,
        setProgressMsg,
      );
      setAudioFilePath(filePath);
      setMediaSrc(serveUrl);
      setStep("downloaded" as AppStep);
      setClipResult(null);
      fetchLibrary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "下载失败，请重试");
      setStep("parsed" as AppStep);
    }
  }, [url, selectedPage, mediaKind, fetchLibrary, videoInfo]);

  const handleMediaLoaded = useCallback((dur: number) => {
    setMediaDuration(dur);
    setStartTime(0);
    setEndTime(dur);
  }, []);

  const handleMediaError = useCallback((msg: string) => {
    setError(msg);
    setStep("parsed" as AppStep);
  }, []);

  const handleClip = useCallback(
    async (format: "m4a" | "mp3" | "mp4") => {
      if (!mediaFilePath) {
        setError("远程预览不支持切片，请先下载到本地缓存后进行切片");
        return;
      }
      setClipping(true);
      setError("");
      setClipResult(null);
      setProgressMsg(isCapacitorNative() ? "正在准备切片..." : "");

      const formatTime = (t: number) => {
        const h = Math.floor(t / 3600);
        const m = Math.floor((t % 3600) / 60);
        const s = Math.floor(t % 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      };

      try {
        const result = await appServices.clipMedia(
          mediaFilePath,
          formatTime(startTime),
          formatTime(endTime),
          format,
          isCapacitorNative() ? setProgressMsg : undefined,
        );
        setClipResult(result);
        fetchLibrary();
      } catch (err) {
        setError(err instanceof Error ? err.message : "切片失败");
      } finally {
        setClipping(false);
        setProgressMsg("");
      }
    },
    [mediaFilePath, startTime, endTime, fetchLibrary],
  );

  const handleLoadLibraryFile = useCallback((file: MediaFileItem) => {
    setAudioFilePath(file.path);
    setMediaSrc(file.serveUrl);
    setMediaKind(file.mediaKind);
    setClipResult(null);
    setError("");
    setStep("downloaded" as AppStep);
  }, []);

  const handleDeleteLibraryFile = useCallback(
    async (file: MediaFileItem) => {
      if (confirm(`确定要删除文件 ${file.name} 吗？`)) {
        try {
          await appServices.deleteMedia(file.path);
          fetchLibrary();
          if (mediaFilePath === file.path) {
            setMediaSrc("");
            setAudioFilePath("");
            setStep("input");
          }
        } catch (err) {
          alert(err instanceof Error ? err.message : "删除失败");
        }
      }
    },
    [mediaFilePath, fetchLibrary],
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-3 py-3 sm:px-4 sm:py-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              B站视音频解析
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 leading-snug">
              {isCapacitorNative()
                ? "Android 本地解析 · 下载 · 切片"
                : "输入链接，选取片段，无损导出视频或音频"}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-8 space-y-5 sm:space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${step === "input" ? "bg-pink-600 text-white" : "bg-green-500 text-white"}`}>
              {step === "input" ? "1" : "✓"}
            </span>
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">输入视频链接</h2>
          </div>
          <UrlInput onParse={handleParse} loading={step === ("parsed" as AppStep) && !videoInfo && !error} />
        </section>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {videoInfo && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                  step === "downloading"
                    ? "bg-pink-600 text-white animate-pulse"
                    : ["downloaded", "clipping", "clipped"].includes(step)
                      ? "bg-green-500 text-white"
                      : "bg-pink-600 text-white"
                }`}
              >
                {["downloaded", "clipping", "clipped"].includes(step) ? "✓" : "2"}
              </span>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">选择媒体与播放模式</h2>
            </div>
            <VideoInfoCard
              info={videoInfo}
              selectedPage={selectedPage}
              onPageChange={setSelectedPage}
              mediaKind={mediaKind}
              onMediaKindChange={setMediaKind}
              onPreview={handlePreview}
              onDownload={handleDownload}
              downloading={step === "downloading"}
            />
          </section>
        )}

        {step === "downloading" && (
          <ProgressIndicator message={progressMsg} type="downloading" />
        )}

        {step === "downloaded" && mediaSrc && (
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold bg-pink-600 text-white">
                3
              </span>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">选取片段</h2>
            </div>

            <MediaPlayer
              src={mediaSrc}
              mediaKind={mediaKind}
              onLoaded={handleMediaLoaded}
              onError={handleMediaError}
              startTime={startTime}
              endTime={endTime}
            />

            {mediaDuration > 0 && (
              <TimelineEditor
                duration={mediaDuration}
                startTime={startTime}
                endTime={endTime}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
            )}

            <ClipPanel
              onClip={handleClip}
              clipping={clipping}
              disabled={startTime >= endTime}
              mediaKind={mediaKind}
              clipResult={clipResult}
            />

            {clipping && progressMsg && (
              <ProgressIndicator message={progressMsg} type="clipping" />
            )}
          </section>
        )}

        <section className="pt-4">
          <MediaLibrary
            files={libraryFiles}
            onLoadFile={handleLoadLibraryFile}
            onDeleteFile={handleDeleteLibraryFile}
            currentFilePath={mediaFilePath}
          />
        </section>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-12">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
          {isCapacitorNative()
            ? "B站视音频解析 · Capacitor Android"
            : "基于 BBDown + FFmpeg 开源工具 | 仅限个人学习使用"}
        </div>
      </footer>
    </div>
  );
}
