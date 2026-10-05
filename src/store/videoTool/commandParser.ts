export function formatCommand(
  argv: string[],
  platform: "win32" | "posix" = typeof process !== "undefined" && process.platform === "win32"
    ? "win32"
    : "posix"
): string {
  return argv
    .map((arg) => {
      if (arg === "") {
        return '""';
      }

      // If the arg contains whitespace, quotes, or special shell characters
      const needsQuotes = /[\s"'\\]/.test(arg);

      if (!needsQuotes) {
        return arg;
      }

      if (platform === "win32") {
        const escaped = arg.replace(/"/g, '\\"');
        return `"${escaped}"`;
      } else {
        if (!arg.includes("'")) {
          return `'${arg}'`;
        }
        const escaped = arg.replace(/"/g, '\\"');
        return `"${escaped}"`;
      }
    })
    .join(" ");
}

export function parseCommand(text: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inDouble = false;
  let inSingle = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inSingle) {
      if (char === "'") {
        inSingle = false;
      } else {
        current += char;
      }
      i++;
    } else if (inDouble) {
      if (char === "\\" && i + 1 < text.length && text[i + 1] === '"') {
        // Escaped double quote inside double quotes
        current += '"';
        i += 2;
      } else if (char === '"') {
        inDouble = false;
        i++;
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inDouble = true;
        i++;
      } else if (char === "'") {
        inSingle = true;
        i++;
      } else if (/\s/.test(char)) {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  if (current.length > 0 || inDouble || inSingle) {
    tokens.push(current);
  }

  return tokens;
}
