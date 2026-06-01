"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { MediaKind } from "@/lib/types";

interface MediaPlayerProps {
  src: string;
  mediaKind: MediaKind;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoaded?: (duration: number) => void;
  onError?: (errorMsg: string) => void;
  startTime?: number;
  endTime?: number;
}

export default function MediaPlayer({
  src,
  mediaKind,
  onTimeUpdate,
  onLoaded,
  onError,
  startTime,
  endTime,
}: MediaPlayerProps) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [showVolume, setShowVolume] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const handleLoaded = () => {
      setDuration(media.duration);
      onLoaded?.(media.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
      onTimeUpdate?.(media.currentTime, media.duration);
    };

    const handleEnded = () => setPlaying(false);

    const handleError = () => {
      onError?.("不支持远程预览");
    };

    media.addEventListener("loadedmetadata", handleLoaded);
    media.addEventListener("timeupdate", handleTimeUpdate);
    media.addEventListener("ended", handleEnded);
    media.addEventListener("error", handleError);

    return () => {
      media.removeEventListener("loadedmetadata", handleLoaded);
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("ended", handleEnded);
      media.removeEventListener("error", handleError);
    };
  }, [src, mediaKind, onTimeUpdate, onLoaded, onError]);

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (playing) {
      media.pause();
    } else {
      if (startTime !== undefined && media.currentTime < startTime) {
        media.currentTime = startTime;
      }
      media.play().catch(() => {});
    }
    setPlaying(!playing);
  }, [playing, startTime]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || endTime === undefined) return;

    const checkBounds = () => {
      if (media.currentTime >= endTime) {
        media.pause();
        media.currentTime = endTime;
        setPlaying(false);
      }
    };
    media.addEventListener("timeupdate", checkBounds);
    return () => media.removeEventListener("timeupdate", checkBounds);
  }, [endTime]);

  const seek = useCallback((time: number) => {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = time;
  }, []);

  const seekFromEvent = useCallback(
    (clientX: number, target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seek(ratio * duration);
    },
    [duration, seek],
  );

  const formatTime = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setMuted(v === 0);
    if (mediaRef.current) {
      mediaRef.current.volume = v;
      mediaRef.current.muted = v === 0;
    }
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (muted) {
      const restored = volume > 0 ? volume : 0.8;
      setVolume(restored);
      media.volume = restored;
      media.muted = false;
      setMuted(false);
    } else {
      media.muted = true;
      setMuted(true);
    }
  };

  const progressBar = (className: string) => (
    <div
      className={`h-2.5 sm:h-2 bg-gray-200 dark:bg-gray-600 rounded-full cursor-pointer relative group touch-none ${className}`}
      onClick={(e) => seekFromEvent(e.clientX, e.currentTarget)}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          e.preventDefault();
          seekFromEvent(e.touches[0].clientX, e.currentTarget);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 1) {
          e.preventDefault();
          seekFromEvent(e.touches[0].clientX, e.currentTarget);
        }
      }}
    >
      {startTime !== undefined && endTime !== undefined && duration > 0 && (
        <div
          className="absolute top-0 h-full bg-pink-200 dark:bg-pink-900/40 rounded-full pointer-events-none"
          style={{
            left: `${(startTime / duration) * 100}%`,
            width: `${((endTime - startTime) / duration) * 100}%`,
          }}
        />
      )}
      <div
        className="h-full bg-pink-600 rounded-full relative z-10 transition-all pointer-events-none"
        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
      />
    </div>
  );

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 space-y-3 sm:space-y-4">
      {mediaKind === "video" && (
        <div className="w-full max-h-[50vh] sm:max-h-none aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement | null>}
            src={src}
            preload="metadata"
            playsInline
            className="w-full h-full object-contain"
            onClick={togglePlay}
          />
        </div>
      )}

      {mediaKind === "audio" && (
        <audio ref={mediaRef as React.RefObject<HTMLAudioElement | null>} src={src} preload="metadata" />
      )}

      {/* 移动端：进度条独占一行 */}
      <div className="sm:hidden w-full">{progressBar("w-full")}</div>

      {/* 控制栏：小屏两行逻辑由上方进度条 + 下行按钮组成；大屏单行 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <button
            onClick={togglePlay}
            className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-pink-600 text-white hover:bg-pink-700 transition-colors shrink-0"
            aria-label={playing ? "暂停" : "播放"}
          >
            {playing ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <span className="text-xs sm:text-sm font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* 桌面端进度条 */}
          <div className="hidden sm:block flex-1 min-w-0">
            {progressBar("w-full")}
          </div>

          {/* 音量：移动端仅图标，点击展开滑条 */}
          <div className="relative flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia("(max-width: 639px)").matches) {
                  setShowVolume((v) => !v);
                } else {
                  toggleMute();
                }
              }}
              onDoubleClick={toggleMute}
              className="p-2 sm:p-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
              aria-label="音量"
            >
              {muted || volume === 0 ? (
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className={`accent-pink-600 transition-all ${
                showVolume
                  ? "w-24 absolute right-0 top-full mt-1 z-10 sm:relative sm:top-auto sm:mt-0"
                  : "hidden sm:block w-20"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
