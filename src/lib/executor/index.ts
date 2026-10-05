import { isTauri } from "../isTauri";
import { Executor } from "./types";
import { TauriExecutor } from "./tauriExecutor";
import { MockExecutor } from "./mockExecutor";

let executorInstance: Executor | null = null;

export function getExecutor(): Executor {
  if (!executorInstance) {
    if (isTauri()) {
      executorInstance = new TauriExecutor();
    } else {
      executorInstance = new MockExecutor();
    }
  }
  return executorInstance;
}

export * from "./types";
export { TauriExecutor } from "./tauriExecutor";
export { MockExecutor } from "./mockExecutor";
