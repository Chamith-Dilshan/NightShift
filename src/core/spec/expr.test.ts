import { describe, it, expect } from "vitest";
import { evalExpr, compareVersions, EvalContext } from "@/core/spec/expr";

describe("evalExpr", () => {
  const baseCtx: EvalContext = { params: {} };

  describe("literal", () => {
    it("returns literal boolean", () => {
      expect(evalExpr({ literal: true }, baseCtx)).toBe(true);
      expect(evalExpr({ literal: false }, baseCtx)).toBe(false);
    });
  });

  describe("eq / ne", () => {
    it("compares param equals literal", () => {
      const ctx: EvalContext = { params: { format: "webp" } };
      expect(evalExpr({ eq: [{ param: "format" }, { literal: "webp" }] }, ctx)).toBe(true);
      expect(evalExpr({ eq: [{ param: "format" }, { literal: "jpg" }] }, ctx)).toBe(false);
      expect(evalExpr({ ne: [{ param: "format" }, { literal: "jpg" }] }, ctx)).toBe(true);
    });
  });

  describe("gt / gte / lt / lte", () => {
    it("compares numeric params", () => {
      const ctx: EvalContext = { params: { quality: 80 } };
      expect(evalExpr({ gt: [{ param: "quality" }, { literal: 70 }] }, ctx)).toBe(true);
      expect(evalExpr({ gt: [{ param: "quality" }, { literal: 90 }] }, ctx)).toBe(false);
      expect(evalExpr({ gte: [{ param: "quality" }, { literal: 80 }] }, ctx)).toBe(true);
      expect(evalExpr({ lt: [{ param: "quality" }, { literal: 90 }] }, ctx)).toBe(true);
      expect(evalExpr({ lte: [{ param: "quality" }, { literal: 80 }] }, ctx)).toBe(true);
    });
  });

  describe("in", () => {
    it("checks membership", () => {
      const ctx: EvalContext = { params: { format: "webp" } };
      expect(evalExpr({ in: [{ param: "format" }, ["webp", "jpg", "png"]] }, ctx)).toBe(true);
      expect(evalExpr({ in: [{ param: "format" }, ["gif", "bmp"]] }, ctx)).toBe(false);
    });
  });

  describe("set / unset", () => {
    it("detects presence and absence", () => {
      const ctx1: EvalContext = { params: { watermark: "logo.png" } };
      const ctx2: EvalContext = { params: {} };
      expect(evalExpr({ set: { param: "watermark" } }, ctx1)).toBe(true);
      expect(evalExpr({ set: { param: "watermark" } }, ctx2)).toBe(false);
      expect(evalExpr({ unset: { param: "watermark" } }, ctx1)).toBe(false);
      expect(evalExpr({ unset: { param: "watermark" } }, ctx2)).toBe(true);
    });
  });

  describe("and / or / not", () => {
    it("combines expressions", () => {
      const ctx: EvalContext = { params: { quality: 80, strip: true } };
      expect(evalExpr(
        { and: [
          { gt: [{ param: "quality" }, { literal: 70 }] },
          { eq: [{ param: "strip" }, { literal: true }] },
        ]},
        ctx
      )).toBe(true);
      expect(evalExpr(
        { or: [
          { eq: [{ param: "quality" }, { literal: 100 }] },
          { eq: [{ param: "strip" }, { literal: true }] },
        ]},
        ctx
      )).toBe(true);
      expect(evalExpr(
        { not: { eq: [{ param: "quality" }, { literal: 100 }] } },
        ctx
      )).toBe(true);
    });
  });

  describe("versionGte", () => {
    it("checks tool version", () => {
      const ctx: EvalContext = { params: {}, toolVersion: "7.1" };
      expect(evalExpr({ versionGte: "6.0" }, ctx)).toBe(true);
      expect(evalExpr({ versionGte: "8.0" }, ctx)).toBe(false);
    });
  });

  describe("depth limit", () => {
    it("throws on deeply nested expressions", () => {
      let expr: any = { literal: true };
      for (let i = 0; i < 20; i++) {
        expr = { and: [expr] };
      }
      expect(() => evalExpr(expr, baseCtx)).toThrow(/depth/);
    });
  });
});

describe("compareVersions", () => {
  it("compares dotted versions", () => {
    expect(compareVersions("7.1", "6.0")).toBe(1);
    expect(compareVersions("6.0", "7.1")).toBe(-1);
    expect(compareVersions("7.1", "7.1")).toBe(0);
    expect(compareVersions("7.1.2", "7.1")).toBe(1);
  });

  it("handles non-standard versions", () => {
    expect(compareVersions("N-118461-gabc", "6.0")).toBe(0);
    expect(compareVersions("7.1-static", "7.1")).toBe(0);
  });
});
