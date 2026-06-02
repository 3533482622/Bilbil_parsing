"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface TimelineEditorProps {
  duration: number;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

const HANDLE_WIDTH = 12;
/** 移动端增大触摸热区 */
const HANDLE_HIT = 24;

export default function TimelineEditor({
  duration,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  currentTime,
  onSeek,
}: TimelineEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const draggingRef = useRef<"start" | "end" | null>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [hoverHandle, setHoverHandle] = useState<"start" | "end" | null>(null);

  const formatTime = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || duration <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 48 * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = "48px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 48;

    ctx.fillStyle =
      getComputedStyle(document.documentElement).getPropertyValue("--timeline-bg").trim() ||
      "#1f2937";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#6b7280";
    ctx.font = "10px monospace";
    const tickInterval = duration > 3600 ? 600 : duration > 600 ? 120 : 30;
    for (let t = 0; t <= duration; t += tickInterval) {
      const x = (t / duration) * w;
      ctx.fillRect(x, h - 8, 1, 8);
      if (t % (tickInterval * 2) === 0) {
        ctx.fillText(formatTime(t), x + 2, h - 12);
      }
    }

    const startX = (startTime / duration) * w;
    const endX = (endTime / duration) * w;
    ctx.fillStyle = "rgba(236, 72, 153, 0.25)";
    ctx.fillRect(startX, 0, endX - startX, h);

    ctx.fillStyle = "#ec4899";
    ctx.fillRect(startX, 0, 2, h);
    ctx.fillRect(endX - 2, 0, 2, h);

    const handleY = h / 2 - 10;
    const handleH = 20;

    ctx.fillStyle = dragging === "start" || hoverHandle === "start" ? "#f472b6" : "#ec4899";
    ctx.beginPath();
    ctx.roundRect(startX - HANDLE_WIDTH / 2, handleY, HANDLE_WIDTH, handleH, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px sans-serif";
    ctx.fillText("S", startX - 3, handleY + 13);

    ctx.fillStyle = dragging === "end" || hoverHandle === "end" ? "#f472b6" : "#ec4899";
    ctx.beginPath();
    ctx.roundRect(endX - HANDLE_WIDTH / 2, handleY, HANDLE_WIDTH, handleH, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText("E", endX - 3, handleY + 13);

    if (currentTime !== undefined && currentTime > 0) {
      const cx = (currentTime / duration) * w;
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(cx - 1, 0, 2, h);
    }
  }, [duration, startTime, endTime, currentTime, dragging, hoverHandle]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container || duration <= 0) return 0;
      const rect = container.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration],
  );

  const getContainerWidth = () =>
    containerRef.current?.getBoundingClientRect().width || 1;

  const hitTestHandle = useCallback(
    (mouseX: number) => {
      if (duration <= 0) return null;
      const w = getContainerWidth();
      const startX = (startTime / duration) * w;
      const endX = (endTime / duration) * w;
      if (Math.abs(mouseX - startX) < HANDLE_HIT) return "start";
      if (Math.abs(mouseX - endX) < HANDLE_HIT) return "end";
      return null;
    },
    [duration, startTime, endTime],
  );

  const beginInteraction = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const mouseX = clientX - container.getBoundingClientRect().left;
      const handle = hitTestHandle(mouseX);
      if (handle) {
        draggingRef.current = handle;
        setDragging(handle);
      } else {
        draggingRef.current = null;
        onSeek?.(getTimeFromClientX(clientX));
      }
    },
    [hitTestHandle, getTimeFromClientX, onSeek],
  );

  const moveInteraction = useCallback(
    (clientX: number) => {
      const activeDrag = draggingRef.current;
      if (activeDrag) {
        const time = getTimeFromClientX(clientX);
        if (activeDrag === "start") {
          onStartTimeChange(Math.min(time, endTime - 1));
        } else {
          onEndTimeChange(Math.max(time, startTime + 1));
        }
      } else {
        const container = containerRef.current;
        if (!container) return;
        const mouseX = clientX - container.getBoundingClientRect().left;
        setHoverHandle(hitTestHandle(mouseX));
      }
    },
    [getTimeFromClientX, onStartTimeChange, onEndTimeChange, startTime, endTime, hitTestHandle],
  );

  const endInteraction = useCallback(() => {
    draggingRef.current = null;
    setDragging(null);
    setHoverHandle(null);
    activePointerIdRef.current = null;
  }, []);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full cursor-crosshair select-none touch-none"
        onPointerDown={(e) => {
          e.preventDefault();
          activePointerIdRef.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          beginInteraction(e.clientX);
        }}
        onPointerMove={(e) => {
          if (activePointerIdRef.current === e.pointerId) {
            e.preventDefault();
            moveInteraction(e.clientX);
            return;
          }
          if (activePointerIdRef.current === null) {
            moveInteraction(e.clientX);
          }
        }}
        onPointerUp={(e) => {
          if (activePointerIdRef.current !== e.pointerId) return;
          e.currentTarget.releasePointerCapture(e.pointerId);
          endInteraction();
        }}
        onPointerCancel={(e) => {
          if (activePointerIdRef.current !== e.pointerId) return;
          e.currentTarget.releasePointerCapture(e.pointerId);
          endInteraction();
        }}
        onMouseLeave={() => !dragging && setHoverHandle(null)}
      >
        <canvas ref={canvasRef} className="w-full rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-4 mt-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
            起始
          </label>
          <input
            type="text"
            value={formatTime(startTime)}
            onChange={(e) => {
              const t = parseTimeInput(e.target.value);
              if (t !== null && t < endTime) onStartTimeChange(t);
            }}
            className="w-full sm:w-24 px-2 py-2 sm:py-1 text-sm font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center min-h-[44px] sm:min-h-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
            结束
          </label>
          <input
            type="text"
            value={formatTime(endTime)}
            onChange={(e) => {
              const t = parseTimeInput(e.target.value);
              if (t !== null && t > startTime && t <= duration) onEndTimeChange(t);
            }}
            className="w-full sm:w-24 px-2 py-2 sm:py-1 text-sm font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center min-h-[44px] sm:min-h-0"
          />
        </div>
        <div className="col-span-2 sm:col-span-1 text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left py-1">
          选区时长: {formatTime(endTime - startTime)}
        </div>
      </div>
    </div>
  );
}

function parseTimeInput(val: string): number | null {
  const parts = val.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}
