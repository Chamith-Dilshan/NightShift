import { useSyncExternalStore } from "react";

const MAX_LOG_LINES = 5000;
const EMPTY_LOGS: LogLine[] = [];

export interface LogLine {
  stream: "stdout" | "stderr" | "system";
  text: string;
  timestamp: number;
}

export class LogStore {
  private logs: Map<string, LogLine[]> = new Map();
  private listeners: Set<() => void> = new Set();

  appendLog(jobId: string, stream: "stdout" | "stderr" | "system", text: string) {
    const prevList = this.logs.get(jobId) || EMPTY_LOGS;
    const newLine: LogLine = {
      stream,
      text,
      timestamp: Date.now(),
    };

    let nextList: LogLine[];
    if (prevList.length >= MAX_LOG_LINES) {
      nextList = [...prevList.slice(prevList.length - MAX_LOG_LINES + 1), newLine];
    } else {
      nextList = [...prevList, newLine];
    }

    this.logs.set(jobId, nextList);
    this.notify();
  }

  getLogs(jobId: string): LogLine[] {
    return this.logs.get(jobId) || EMPTY_LOGS;
  }

  clearLogs(jobId: string) {
    if (this.logs.has(jobId)) {
      this.logs.delete(jobId);
      this.notify();
    }
  }

  clearAll() {
    if (this.logs.size > 0) {
      this.logs.clear();
      this.notify();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const logStore = new LogStore();

export function useJobLogs(jobId: string | null): LogLine[] {
  return useSyncExternalStore(
    (onStoreChange) => logStore.subscribe(onStoreChange),
    () => (jobId ? logStore.getLogs(jobId) : EMPTY_LOGS),
    () => EMPTY_LOGS
  );
}
