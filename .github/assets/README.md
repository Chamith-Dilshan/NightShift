# Asset Guidelines for NightShift

This directory (`.github/assets/`) is designated for repository documentation graphics, logos, banners, and demo previews.

### Why assets are stored here:
- **Tauri Application Isolation:** Next.js static exports only bundle files located inside `public/`. Placing marketing media and video demos in `.github/assets/` ensures they are **never** bundled into the compiled desktop application installer binary (`.exe`, `.dmg`, `.AppImage`).
- **Demo Videos:** If recording a demo video:
  - Option 1: Convert a 10-20s snippet to an optimized `.gif` or `.mp4` and place it here as `demo.mp4` / `demo-preview.png`.
  - Option 2 (Recommended for large videos > 10MB): Upload the `.mp4` to a GitHub Release or GitHub Issue asset attachment (using GitHub CDN) and link it in `README.md`.
