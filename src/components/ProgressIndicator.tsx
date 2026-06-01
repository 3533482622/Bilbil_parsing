"use client";

interface ProgressIndicatorProps {
  message: string;
  type: "downloading" | "clipping" | "error";
}

export default function ProgressIndicator({ message, type }: ProgressIndicatorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className={`flex items-center gap-3 p-4 rounded-lg border ${
          type === "error"
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        }`}
      >
        {type !== "error" && (
          <svg className="animate-spin h-5 w-5 text-blue-500 shrink-0" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {type === "error" && (
          <svg className="h-5 w-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        )}
        <p
          className={`text-sm ${
            type === "error"
              ? "text-red-700 dark:text-red-400"
              : "text-blue-700 dark:text-blue-400"
          }`}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
