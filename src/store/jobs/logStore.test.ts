import { describe, it, expect, vi } from "vitest";
import { LogStore } from "./logStore";

describe("LogStore", () => {
  it("returns stable empty array when jobId is unknown", () => {
    const store = new LogStore();
    const snap1 = store.getLogs("non-existent");
    const snap2 = store.getLogs("non-existent");
    expect(snap1).toEqual([]);
    expect(snap1).toBe(snap2); // Exact reference equality
  });

  it("returns immutable array updates on appendLog", () => {
    const store = new LogStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const initial = store.getLogs("job-1");
    expect(initial).toEqual([]);

    store.appendLog("job-1", "stdout", "first line");
    expect(listener).toHaveBeenCalledTimes(1);

    const snap1 = store.getLogs("job-1");
    expect(snap1).toHaveLength(1);
    expect(snap1[0].text).toBe("first line");
    expect(snap1).not.toBe(initial);

    store.appendLog("job-1", "stderr", "second line");
    expect(listener).toHaveBeenCalledTimes(2);

    const snap2 = store.getLogs("job-1");
    expect(snap2).toHaveLength(2);
    expect(snap2).not.toBe(snap1);

    // Repeated gets without append return stable reference
    const snap2b = store.getLogs("job-1");
    expect(snap2b).toBe(snap2);
  });

  it("handles clearing logs properly", () => {
    const store = new LogStore();
    store.appendLog("job-1", "stdout", "line");
    expect(store.getLogs("job-1")).toHaveLength(1);

    store.clearLogs("job-1");
    expect(store.getLogs("job-1")).toEqual([]);
    expect(store.getLogs("job-1")).toBe(store.getLogs("job-2")); // Empty singleton
  });
});
