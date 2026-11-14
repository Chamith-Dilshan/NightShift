import { Expr, ExprValue } from "./schema";
import { compareVersions } from "./versions";

// ─── Context ───

export interface EvalContext {
  params: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  toolVersion?: string;
  probes?: Record<string, string[]>;
}

// ─── Evaluator ───

const MAX_DEPTH = 16;
const MAX_NODES = 256;

/**
 * Evaluate an expression against a context.
 * Pure, total — unknown params evaluate to unset.
 */
export function evalExpr(expr: Expr, ctx: EvalContext): boolean {
  // Count nodes to reject overly complex expressions
  const count = countNodes(expr);
  if (count > MAX_NODES) {
    throw new Error(`Expression exceeds maximum node count (${MAX_NODES})`);
  }

  return evalExprInner(expr, ctx, 0);
}

function evalExprInner(expr: Expr, ctx: EvalContext, depth: number): boolean {
  if (depth > MAX_DEPTH) {
    throw new Error(`Expression exceeds maximum depth (${MAX_DEPTH})`);
  }

  const nextDepth = depth + 1;

  if ("eq" in expr) return evalValue((expr as { eq: [ExprValue, ExprValue] }).eq[0], ctx) === evalValue((expr as { eq: [ExprValue, ExprValue] }).eq[1], ctx);
  if ("ne" in expr) return evalValue((expr as { ne: [ExprValue, ExprValue] }).ne[0], ctx) !== evalValue((expr as { ne: [ExprValue, ExprValue] }).ne[1], ctx);
  if ("gt" in expr) return toNumber(evalValue((expr as { gt: [ExprValue, ExprValue] }).gt[0], ctx)) > toNumber(evalValue((expr as { gt: [ExprValue, ExprValue] }).gt[1], ctx));
  if ("gte" in expr) return toNumber(evalValue((expr as { gte: [ExprValue, ExprValue] }).gte[0], ctx)) >= toNumber(evalValue((expr as { gte: [ExprValue, ExprValue] }).gte[1], ctx));
  if ("lt" in expr) return toNumber(evalValue((expr as { lt: [ExprValue, ExprValue] }).lt[0], ctx)) < toNumber(evalValue((expr as { lt: [ExprValue, ExprValue] }).lt[1], ctx));
  if ("lte" in expr) return toNumber(evalValue((expr as { lte: [ExprValue, ExprValue] }).lte[0], ctx)) <= toNumber(evalValue((expr as { lte: [ExprValue, ExprValue] }).lte[1], ctx));
  if ("in" in expr && Array.isArray((expr as { in: [ExprValue, (string | number | boolean)[]] }).in[1])) {
    const val = evalValue((expr as { in: [ExprValue, (string | number | boolean)[]] }).in[0], ctx);
    const arr = (expr as { in: [ExprValue, (string | number | boolean)[]] }).in[1] as unknown[];
    return arr.includes(val);
  }
  if ("set" in expr) return isSet(evalValue((expr as { set: ExprValue }).set, ctx));
  if ("unset" in expr) return !isSet(evalValue((expr as { unset: ExprValue }).unset, ctx));
  if ("has" in expr) {
    const hasExpr = expr as { has: { probe: string; value: ExprValue } };
    const probeResult = ctx.probes?.[hasExpr.has.probe] ?? [];
    const val = evalValue(hasExpr.has.value, ctx);
    return probeResult.includes(String(val));
  }
  if ("versionGte" in expr) {
    if (!ctx.toolVersion) return false;
    return compareVersions(ctx.toolVersion, (expr as { versionGte: string }).versionGte) >= 0;
  }
  if ("and" in expr) return (expr as { and: Expr[] }).and.every((e: Expr) => evalExprInner(e, ctx, nextDepth));
  if ("or" in expr) return (expr as { or: Expr[] }).or.some((e: Expr) => evalExprInner(e, ctx, nextDepth));
  if ("not" in expr) return !evalExprInner((expr as { not: Expr }).not, ctx, nextDepth);
  if ("literal" in expr) return (expr as { literal: boolean }).literal;

  return false;
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function isSet(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === "string") return val.length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

function evalValue(v: ExprValue, ctx: EvalContext): unknown {
  if ("param" in v) return ctx.params[v.param];
  if ("literal" in v) return v.literal;
  if ("in" in v) return ctx.inputs?.[v.in];
  if ("out" in v) return ctx.outputs?.[v.out];
  if ("toolVersion" in v) return ctx.toolVersion;
  return undefined;
}

function countNodes(expr: Expr): number {
  let count = 1;
  if ("and" in expr) count += (expr as { and: Expr[] }).and.reduce((sum: number, e: Expr) => sum + countNodes(e), 0);
  if ("or" in expr) count += (expr as { or: Expr[] }).or.reduce((sum: number, e: Expr) => sum + countNodes(e), 0);
  if ("not" in expr) count += countNodes((expr as { not: Expr }).not);
  return count;
}

// Version comparison is in versions.ts — re-export for convenience
export { compareVersions } from "./versions";
