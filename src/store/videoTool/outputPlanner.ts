import { VideoSettings } from "./types";

export interface PlannedOutput {
  input: string;
  output: string;
  existedBefore: boolean;
}

export function planOutputs(
  settings: VideoSettings,
  inputs: string[],
  existing: Set<string>
): PlannedOutput[] {
  const planned: PlannedOutput[] = [];
  const claimedOutputs = new Set<string>();

  for (let i = 0; i < inputs.length; i++) {
    const inputPath = inputs[i];
    const { dir: inputDir, baseName } = parsePath(inputPath);
    const targetDir = settings.output.dir || inputDir;

    let ext: string = settings.output.format;
    if (ext === "custom") {
      ext = (settings.output.customExt || "mp4").replace(/^\./, "");
    }

    let templateName = settings.output.nameTemplate || "{name}_nightshift";
    if (templateName.includes("{name}")) {
      templateName = templateName.replaceAll("{name}", baseName);
    } else if (inputs.length > 1) {
      templateName = `${templateName}_${i + 1}`;
    }

    const separator = targetDir.includes("\\") ? "\\" : "/";
    const cleanDir = targetDir.replace(/[\\/]+$/, "");
    const baseTarget = `${cleanDir}${separator}${templateName}.${ext}`;

    if (settings.output.collision === "overwrite") {
      const existedBefore = existing.has(baseTarget);
      claimedOutputs.add(baseTarget);
      planned.push({
        input: inputPath,
        output: baseTarget,
        existedBefore,
      });
    } else {
      // Suffix mode
      let finalPath = baseTarget;
      let counter = 1;

      while (existing.has(finalPath) || claimedOutputs.has(finalPath)) {
        finalPath = `${cleanDir}${separator}${templateName}_${counter}.${ext}`;
        counter++;
      }

      claimedOutputs.add(finalPath);
      planned.push({
        input: inputPath,
        output: finalPath,
        existedBefore: false,
      });
    }
  }

  return planned;
}

export function parsePath(fullPath: string): { dir: string; baseName: string; ext: string } {
  // Normalize Windows and POSIX separators
  const parts = fullPath.split(/[\\/]/);
  const fileName = parts.pop() || "";
  const dir = parts.join(fullPath.includes("\\") ? "\\" : "/") || ".";

  const dotIdx = fileName.lastIndexOf(".");
  if (dotIdx > 0) {
    const baseName = fileName.substring(0, dotIdx);
    const ext = fileName.substring(dotIdx + 1);
    return { dir, baseName, ext };
  }

  return { dir, baseName: fileName, ext: "" };
}
