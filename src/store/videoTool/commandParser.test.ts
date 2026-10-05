import { describe, it, expect } from "vitest";
import { formatCommand, parseCommand } from "./commandParser";

describe("commandParser", () => {
  it("should parse standard space-separated command", () => {
    const input = "ffmpeg -i input.mp4 -c:v libx264 output.mp4";
    expect(parseCommand(input)).toEqual([
      "ffmpeg",
      "-i",
      "input.mp4",
      "-c:v",
      "libx264",
      "output.mp4",
    ]);
  });

  it("should preserve double quoted arguments with spaces", () => {
    const input = 'ffmpeg -i "my vacation video.mp4" -vf "scale=1920:1080" "final output.mp4"';
    expect(parseCommand(input)).toEqual([
      "ffmpeg",
      "-i",
      "my vacation video.mp4",
      "-vf",
      "scale=1920:1080",
      "final output.mp4",
    ]);
  });

  it("should preserve single quoted arguments", () => {
    const input = "ffmpeg -i 'input with spaces.mp4' 'out.mp4'";
    expect(parseCommand(input)).toEqual([
      "ffmpeg",
      "-i",
      "input with spaces.mp4",
      "out.mp4",
    ]);
  });

  it("should preserve Windows backslashes and filter escapes", () => {
    const input = 'ffmpeg -i "C:\\Users\\John Doe\\Videos\\in.mp4" -vf "min(720\\,ih)" "C:\\out.mp4"';
    expect(parseCommand(input)).toEqual([
      "ffmpeg",
      "-i",
      "C:\\Users\\John Doe\\Videos\\in.mp4",
      "-vf",
      "min(720\\,ih)",
      "C:\\out.mp4",
    ]);
  });

  it("should round-trip test vectors with formatCommand and parseCommand", () => {
    const vectors: string[][] = [
      ["ffmpeg", "-n", "-i", "in.mov", "-c:v", "libx264", "out.mp4"],
      ["ffmpeg", "-i", "C:\\path\\with space\\video.mp4", "-y", "D:\\output.mp4"],
      ["ffmpeg", "-vf", "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=bayer", "out.gif"],
      ["ffmpeg", "-i", 'video "special".mp4', "unicode_日本語_🚀.mp4"],
    ];

    for (const argv of vectors) {
      const formattedWin = formatCommand(argv, "win32");
      const parsedWin = parseCommand(formattedWin);
      expect(parsedWin).toEqual(argv);

      const formattedPosix = formatCommand(argv, "posix");
      const parsedPosix = parseCommand(formattedPosix);
      expect(parsedPosix).toEqual(argv);
    }
  });
});
