/**
 * Lenient version comparison.
 * Parses the leading numeric dotted prefix; unparseable versions disable range checks with a warning.
 */

/**
 * Compare two version strings.
 * Returns -1, 0, or 1.
 */
export function compareVersions(a: string, b: string): number {
  const partsA = parseVersion(a);
  const partsB = parseVersion(b);

  // If either version is unparseable, return 0 (treat as equal, let the caller warn)
  if (partsA.length === 0 || partsB.length === 0) {
    return 0;
  }

  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const pa = i < partsA.length ? partsA[i] : 0;
    const pb = i < partsB.length ? partsB[i] : 0;
    if (pa > pb) return 1;
    if (pa < pb) return -1;
  }
  return 0;
}

/**
 * Check if version `a` satisfies a range like ">=6.0" or ">=5".
 */
export function satisfiesRange(version: string, range: string): { ok: boolean; warning?: string } {
  const match = range.match(/^>=(.+)$/);
  if (!match) {
    return { ok: true, warning: `Unknown range format: ${range}` };
  }

  const minVersion = match[1];
  const parts = parseVersion(version);
  if (parts.length === 0) {
    return { ok: true, warning: `Cannot parse version "${version}", skipping range check` };
  }

  return { ok: compareVersions(version, minVersion) >= 0 };
}

/**
 * Check if a version is parseable.
 */
export function isParseable(version: string): boolean {
  return parseVersion(version).length > 0;
}

function parseVersion(v: string): number[] {
  const match = v.match(/^(\d+(?:\.\d+)*)/);
  if (!match) return [];
  return match[1].split(".").map(Number);
}
