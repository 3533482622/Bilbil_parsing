# B站音视频剪辑 Web 应用

## 项目概述

基于 Next.js 的全栈 Web 应用，输入 B 站视频链接后，可在线播放视频或音频、可视化选取片段、导出切片文件。后端调用本地 BBDown + FFmpeg 完成下载和切片。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16 | 全栈框架（App Router + API Routes） |
| React | 19 | UI 渲染 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 4 | 样式 |
| BBDown | 1.6.3 | B站视频/音频下载 |
| FFmpeg | 8.1.1 | 音频/视频切片与转码 |

## 项目结构

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 根布局
│   │   ├── page.tsx                # 主页面（音视频完整工作流）
│   │   ├── globals.css             # 全局样式
│   │   └── api/
│   │       ├── bilibili/
│   │       │   ├── parse/route.ts  # 解析视频/音频流与直链
│   │       │   └── download/route.ts # 下载音视频（SSE 推送进度）
│   │       ├── clip/route.ts       # 音视频切片
│   │       ├── media/route.ts      # 资源库列表与删除
│   │       └── serve/[...path]/route.ts # 文件服务（支持 Range 流式播放）
│   ├── components/
│   │   ├── UrlInput.tsx            # URL 输入框
│   │   ├── VideoInfoCard.tsx       # 视频信息与模式选择卡片
│   │   ├── MediaPlayer.tsx         # 音视频播放器
│   │   ├── TimelineEditor.tsx      # 时间轴选取器
│   │   ├── ClipPanel.tsx           # 切片控制面板
│   │   ├── MediaLibrary.tsx        # 资源管理库
│   │   └── ProgressIndicator.tsx   # 进度指示器
│   └── lib/
│       ├── tools.ts                # BBDown/FFmpeg/FFprobe 封装
│       └── types.ts                # 类型定义
└── .cache/                         # 运行时缓存（下载/输出）
```

## 快速开始

### 前提条件

1. Node.js 18+
2. Windows 系统（BBDown.exe 为 Windows 二进制）
3. `redio/tools/` 目录包含 `BBDown.exe`、`ffmpeg.exe`、`ffprobe.exe`

### 安装与运行

```bash
cd web
npm install
npm run dev
```

打开 http://localhost:3000 即可使用。

## Capacitor Android App（待完成）

应用名：**B站视音频解析**  
包名：`com.graduation.biliavparser`

### 前提条件

1. Android Studio（含 Android SDK）
2. JDK 17+

### 构建与同步

```bash
cd web
npm install
npm run build:cap    # 静态导出到 out/（会暂移 API routes）
npx cap sync android
npx cap open android # 在 Android Studio 中编译运行
```

日常 Web 开发仍使用 `npm run dev`（BBDown + FFmpeg 后端）。  
Android 壳内自动走原生服务层（B 站开放 API + Capacitor Filesystem + FFmpeg.wasm）。

修改前端后重新执行：

```bash
npm run build:cap
npm run cap:sync
```

## 使用流程

1. **输入链接** - 在首页输入 B 站视频/番剧链接（支持 ep/ss/BV/av 格式）
2. **解析信息** - 系统自动获取视频标题、分P列表、可用视频流与音频流
3. **播放模式** - 
   - **尝试远程预览**：直接解析出 B 站临时直链，加载到播放器直接预览（省去下载时间，但可能受防盗链或 CORS 限制）。
   - **下载本地缓存**：调用 BBDown 完整拉取并混流至本地缓存目录，再通过本地文件服务流畅播放。
4. **选取片段** - 在时间轴上拖拽起止手柄，或手动输入时间码
5. **导出切片** - 
   - 音频模式：选择 M4A（无损）或 MP3（192kbps）格式导出。
   - 视频模式：选择 MP4（无损流复制）格式导出。
6. **资源管理** - 在底部的“已下载资源库”中，可以随时载入已下载的文件、下载到浏览器或安全删除缓存。

## API 说明

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/bilibili/parse` | POST | 解析视频元数据、流与直链 |
| `/api/bilibili/download` | POST | 下载音视频（SSE 流式进度） |
| `/api/clip` | POST | 音视频切片 |
| `/api/media` | GET / DELETE | 资源库列表与删除 |
| `/api/serve/[...path]` | GET | 文件静态服务（支持 Range 分片播放） |

## 依赖说明

除 Next.js 外，运行时还使用 `iconv-lite` 处理 BBDown 在 Windows 下的控制台编码（自动识别 UTF-8 / GBK）。

## 注意事项

- 大会员番剧需要在终端中扫码登录（BBDown 会显示二维码，请查看运行 `npm run dev` 的终端窗口）
- 下载的大文件缓存到 `.cache/download/`，建议定期清理
- 切片输出保存在 `.cache/output/`
- 仅支持 Windows 系统（依赖 BBDown.exe）
