import { NextRequest, NextResponse } from "next/server";
import { listMediaFiles, deleteMediaFile } from "@/lib/tools";

export async function GET() {
  try {
    const files = listMediaFiles();
    return NextResponse.json({ success: true, data: files });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "获取列表失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { path: absPath } = await request.json();
    if (!absPath) {
      return NextResponse.json({ success: false, error: "缺少文件路径" }, { status: 400 });
    }
    deleteMediaFile(absPath);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "删除失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
