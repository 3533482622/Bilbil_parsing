import { NextRequest, NextResponse } from "next/server";
import { parseBilibiliVideo } from "@/lib/tools";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "请提供有效的B站视频链接" },
        { status: 400 }
      );
    }

    // 验证是否为 B 站链接
    const validPatterns = [
      /bilibili\.com/,
      /b23\.tv/,
      /^BV[A-Za-z0-9]+$/,
      /^av\d+$/,
      /^ep\d+$/,
      /^ss\d+$/,
    ];

    const isValid = validPatterns.some((p) => p.test(url));
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "请输入有效的B站视频链接（支持 ep/ss/BV/av 格式）" },
        { status: 400 }
      );
    }

    const videoInfo = await parseBilibiliVideo(url);

    return NextResponse.json({
      success: true,
      data: videoInfo,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "解析失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
