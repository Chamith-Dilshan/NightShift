from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent

TOOLS_DIR = BASE_DIR / "app/tools"

if sys.platform.startswith("win"):
    FFMPEG = TOOLS_DIR / "ffmpeg" / "ffmpeg.exe"
    CWEBP = TOOLS_DIR / "webp" / "cwebp.exe"
    DWEBP = TOOLS_DIR / "webp" / "dwebp.exe"
else:
    FFMPEG = TOOLS_DIR / "ffmpeg" / "ffmpeg"
    CWEBP = TOOLS_DIR / "webp" / "cwebp"
    DWEBP = TOOLS_DIR / "webp" / "dwebp"
