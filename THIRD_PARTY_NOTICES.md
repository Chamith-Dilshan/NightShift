# Third-Party Notices & Licenses

NightShift relies on external open-source software and tools.

## FFmpeg & FFprobe

NightShift does **not** bundle FFmpeg or FFprobe binaries in its distribution packages or installers. Instead, NightShift detects existing system-installed binaries or provides a first-run wizard to download verified static builds into the user's local application data directory.

- **Project:** FFmpeg (https://ffmpeg.org)
- **License:** GNU General Public License v3.0 / GNU Lesser General Public License v3.0
- **Build Sources:**
  - Windows: BtbN / FFmpeg-Builds (GPL v3.0) & Gyan.dev
  - Linux: BtbN / FFmpeg-Builds & John Van Sickle static builds
  - macOS: Evermeet static release builds

## Open-Source Libraries

NightShift includes software developed by third parties under permissive open-source licenses:

- **Tauri** (MIT / Apache-2.0)
- **Next.js & React** (MIT)
- **Redux Toolkit** (MIT)
- **Tailwind CSS & shadcn/ui** (MIT)
- **Zod** (MIT)
- **Vitest** (MIT)
- **Tokio & Reqwest** (MIT)
