import { NextRequest } from "next/server";
import { downloadBilibiliMedia } from "@/lib/tools";
import { MediaKind } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { url, page, mediaKind = "audio" } = await request.json();

  if (!url || typeof url !== "string") {
    return new Response(JSON.stringify({ error: "请提供有效的B站视频链接" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const kind: MediaKind = mediaKind === "video" ? "video" : "audio";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const proc = downloadBilibiliMedia(
        url,
        kind,
        (msg) => send({ type: "progress", message: msg }),
        (filePath, serveUrl) => send({ type: "done", filePath, serveUrl }),
        (err) => {
          send({ type: "error", error: err });
          controller.close();
        },
        page,
      );

      proc.on("close", () => {
        controller.close();
      });

      request.signal.addEventListener("abort", () => {
        proc.kill();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
