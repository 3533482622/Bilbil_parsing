import { NextRequest, NextResponse } from "next/server";
import { clipMedia } from "@/lib/tools";

export async function POST(request: NextRequest) {
  try {
    const { filePath, start, end, format } = await request.json();

    if (!filePath || !start || !end) {
      return NextResponse.json(
        { error: "缺少必要参数：filePath, start, end" },
        { status: 400 }
      );
    }

    let outputFormat: "m4a" | "mp3" | "mp4" = "m4a";
    if (format === "mp3") {
      outputFormat = "mp3";
    } else if (format === "mp4") {
      outputFormat = "mp4";
    }

    const { outputPath, serveUrl } = await clipMedia(
      filePath,
      start,
      end,
      outputFormat,
    );

    return NextResponse.json({
      success: true,
      outputPath,
      serveUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "切片失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
