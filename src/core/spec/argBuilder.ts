import { ToolSpec, ArgNode, ValueExpr, Expr as ExprType } from "./schema";
import { evalExpr, EvalContext } from "./expr";

// ─── Context ───

export interface BuildContext {
  platform: "windows" | "unix";
  probes?: Record<string, string[]>;
  capabilities?: Record<string, unknown>;
  toolVersion?: string;
}

export interface BuildIO {
  inputs: Record<string, string | string[]>;
  outputs: Record<string, string>;
}

export interface BuiltCommand {
  toolId: string;
  commandId: string;
  binaryId: string;
  args: string[];
  display: string;
  inputs: Record<string, string | string[]>;
  outputs: Record<string, string>;
  issues: Issue[];
  adjustments: string[];
}

export interface Issue {
  path: string;
  message: string;
  severity: "error" | "warning" | "info";
}

// ─── Builder ───

/**
 * Build a command from a spec, command id, params, and I/O.
 * Pure function — same inputs always produce the same output.
 */
export function buildCommand(
  spec: ToolSpec,
  commandId: string,
  params: Record<string, unknown>,
  io: BuildIO,
  ctx: BuildContext
): BuiltCommand {
  const command = spec.commands.find((c) => c.id === commandId);
  if (!command) {
    return {
      toolId: spec.id,
      commandId,
      binaryId: "",
      args: [],
      display: "",
      inputs: io.inputs,
      outputs: io.outputs,
      issues: [{ path: "command", message: `Command '${commandId}' not found`, severity: "error" }],
      adjustments: [],
    };
  }

  const evalCtx: EvalContext = {
    params,
    inputs: io.inputs,
    outputs: io.outputs,
    toolVersion: ctx.toolVersion,
    probes: ctx.probes,
  };

  const args: string[] = [];
  const issues: Issue[] = [];
  const adjustments: string[] = [];

  // Build args from the template
  buildArgs(command.args, params, io, evalCtx, args, issues, adjustments);

  // Add end-of-options marker if specified
  if (command.endOfOptions && args.length > 0) {
    // "--" is added by the runner if needed
  }

  // Build display string
  const display = buildDisplay(args);

  return {
    toolId: spec.id,
    commandId,
    binaryId: command.binary,
    args,
    display,
    inputs: io.inputs,
    outputs: io.outputs,
    issues,
    adjustments,
  };
}

function buildArgs(
  nodes: ArgNode[],
  params: Record<string, unknown>,
  io: BuildIO,
  evalCtx: EvalContext,
  result: string[],
  issues: Issue[],
  adjustments: string[]
): void {
  for (const node of nodes) {
    // Check visibility condition
    if ("when" in node && "when" in node && (node as { when?: ExprType }).when !== undefined) {
      if (!evalExpr((node as { when: ExprType }).when, evalCtx)) {
        continue;
      }
    }

    switch (node.kind) {
      case "flag":
        result.push((node as { flag: string }).flag);
        break;

      case "option": {
        const optNode = node as { flag: string; value: ValueExpr; style?: string };
        const value = resolveValueExpr(optNode.value, params, io, evalCtx);
        if (value !== undefined && value !== "") {
          const strValue = String(value);
          switch (optNode.style ?? "separate") {
            case "separate":
              result.push(optNode.flag);
              result.push(strValue);
              break;
            case "equals":
              result.push(`${optNode.flag}=${strValue}`);
              break;
            case "concat":
              result.push(`${optNode.flag}${strValue}`);
              break;
          }
        }
        break;
      }

      case "positional": {
        const value = resolveValueExpr((node as { value: ValueExpr }).value, params, io, evalCtx);
        if (value !== undefined && value !== "") {
          result.push(String(value));
        }
        break;
      }

      case "group":
        buildArgs((node as { args: ArgNode[] }).args, params, io, evalCtx, result, issues, adjustments);
        break;

      case "repeat": {
        const repeatNode = node as { param: string; node: ArgNode };
        const paramValue = params[repeatNode.param];
        if (Array.isArray(paramValue) && paramValue.length > 0) {
          for (const item of paramValue) {
            // Create a context with {item} set
            const itemCtx: EvalContext = {
              ...evalCtx,
              params: { ...evalCtx.params, item },
            };
            buildArgs([repeatNode.node], params, io, itemCtx, result, issues, adjustments);
          }
        }
        break;
      }
    }
  }
}

function resolveValueExpr(
  expr: ValueExpr,
  params: Record<string, unknown>,
  io: BuildIO,
  evalCtx: EvalContext
): string | undefined {
  if ("param" in expr) {
    return params[expr.param] !== undefined ? String(params[expr.param]) : undefined;
  }
  if ("in" in expr) {
    const val = io.inputs[expr.in];
    if (val === undefined) return undefined;
    return Array.isArray(val) ? val.join(" ") : String(val);
  }
  if ("out" in expr) {
    return io.outputs[expr.out] ?? undefined;
  }
  if ("literal" in expr) {
    return String(expr.literal);
  }
  if ("format" in expr) {
    return resolveFormat(expr.format, params, io, evalCtx);
  }
  if ("join" in expr) {
    return resolveJoin(expr.join, params, io, evalCtx);
  }
  if ("map" in expr) {
    const paramValue = params[expr.map.param];
    if (paramValue === undefined) return undefined;
    return expr.map.table[String(paramValue)] ?? String(paramValue);
  }
  return undefined;
}

function resolveFormat(
  format: string,
  params: Record<string, unknown>,
  io: BuildIO,
  evalCtx: EvalContext
): string {
  // Replace {param}, {in:id}, {out:id}, {item} placeholders
  return format.replace(/\{([^}]+)\}/g, (match, key) => {
    // Check for in:id
    const inMatch = key.match(/^in:(.+)$/);
    if (inMatch) {
      const val = io.inputs[inMatch[1]];
      if (val === undefined) return match;
      return Array.isArray(val) ? val.join(" ") : String(val);
    }
    // Check for out:id
    const outMatch = key.match(/^out:(.+)$/);
    if (outMatch) {
      return io.outputs[outMatch[1]] ?? match;
    }
    // Check for param or item
    if (key === "item" && evalCtx.params.item !== undefined) {
      return String(evalCtx.params.item);
    }
    if (params[key] !== undefined) {
      return String(params[key]);
    }
    // Escape sequence {{ or }}
    if (key === "{" || key === "}") {
      return key;
    }
    return match;
  });
}

function resolveJoin(
  join: { sep: string; items: { when?: ExprType; value: ValueExpr }[] },
  params: Record<string, unknown>,
  io: BuildIO,
  evalCtx: EvalContext
): string {
  const parts: string[] = [];
  for (const item of join.items) {
    if (item.when && !evalExpr(item.when, evalCtx)) {
      continue;
    }
    const value = resolveValueExpr(item.value, params, io, evalCtx);
    if (value !== undefined && value !== "") {
      parts.push(value);
    }
  }
  return parts.join(join.sep);
}

function buildDisplay(args: string[]): string {
  return args.map((arg) => {
    // Quote args that contain spaces or special characters
    if (/\s|"/.test(arg)) {
      return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
  }).join(" ");
}
