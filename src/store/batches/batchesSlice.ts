import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BatchItem, OutputOptions } from "@/core/batch";

export type BatchStatus = "planning" | "ready" | "running" | "paused" | "done" | "failed";

export interface BatchState {
  id: string;
  toolId: string;
  templateId?: string;
  status: BatchStatus;
  options: OutputOptions;
  items: BatchItem[];
  jobIds: string[];
  /** Number of items completed successfully */
  completed: number;
  /** Number of items that failed */
  failed: number;
  /** Number of items cancelled */
  cancelled: number;
  /** Number of items skipped */
  skipped: number;
  /** Wall clock start time */
  startedAt?: number;
  /** Wall clock end time */
  finishedAt?: number;
  /** Concurrency setting */
  concurrency: number;
  /** Failure policy */
  failurePolicy: "continue" | "stop-on-first-failure";
  /** Total bytes of input files */
  inputBytes: number;
  /** Total bytes of output files (after completion) */
  outputBytes?: number;
  /** Per-job last error line */
  jobErrors: Record<string, string | undefined>;
  /** Created at timestamp */
  createdAt: number;
}

export interface BatchesSliceState {
  batches: Record<string, BatchState>;
  order: string[];
  activeBatchId?: string;
}

const initialState: BatchesSliceState = {
  batches: {},
  order: [],
  activeBatchId: undefined,
};

export const batchesSlice = createSlice({
  name: "batches",
  initialState,
  reducers: {
    /** Create a new batch from a plan */
    createBatch: (
      state,
      action: PayloadAction<{
        id: string;
        toolId: string;
        templateId?: string;
        options: OutputOptions;
        items: BatchItem[];
        concurrency?: number;
        failurePolicy?: "continue" | "stop-on-first-failure";
        inputBytes: number;
      }>
    ) => {
      const {
        id,
        toolId,
        templateId,
        options,
        items,
        concurrency = 1,
        failurePolicy = "continue",
        inputBytes,
      } = action.payload;

      const batch: BatchState = {
        id,
        toolId,
        templateId,
        status: "ready",
        options,
        items,
        jobIds: [],
        completed: 0,
        failed: 0,
        cancelled: 0,
        skipped: 0,
        concurrency,
        failurePolicy,
        inputBytes,
        jobErrors: {},
        createdAt: Date.now(),
      };

      state.batches[id] = batch;
      if (!state.order.includes(id)) {
        state.order.push(id);
      }
      state.activeBatchId = id;
    },

    /** Set batch status */
    setBatchStatus: (
      state,
      action: PayloadAction<{ id: string; status: BatchStatus }>
    ) => {
      const batch = state.batches[action.payload.id];
      if (batch) {
        batch.status = action.payload.status;
        if (action.payload.status === "running" && !batch.startedAt) {
          batch.startedAt = Date.now();
        }
        if (action.payload.status === "done" || action.payload.status === "failed") {
          batch.finishedAt = Date.now();
        }
      }
    },

    /** Add a job ID to a batch */
    addBatchJob: (
      state,
      action: PayloadAction<{ batchId: string; jobId: string }>
    ) => {
      const batch = state.batches[action.payload.batchId];
      if (batch) {
        batch.jobIds.push(action.payload.jobId);
      }
    },

    /** Update job count for a batch */
    updateBatchJobCount: (
      state,
      action: PayloadAction<{
        id: string;
        completed?: number;
        failed?: number;
        cancelled?: number;
        skipped?: number;
      }>
    ) => {
      const batch = state.batches[action.payload.id];
      if (batch) {
        if (action.payload.completed !== undefined) batch.completed += action.payload.completed;
        if (action.payload.failed !== undefined) batch.failed += action.payload.failed;
        if (action.payload.cancelled !== undefined) batch.cancelled += action.payload.cancelled;
        if (action.payload.skipped !== undefined) batch.skipped += action.payload.skipped;
      }
    },

    /** Set output bytes for a batch */
    setOutputBytes: (
      state,
      action: PayloadAction<{ id: string; bytes: number }>
    ) => {
      const batch = state.batches[action.payload.id];
      if (batch) {
        batch.outputBytes = action.payload.bytes;
      }
    },

    /** Record a job error for a batch */
    recordJobError: (
      state,
      action: PayloadAction<{ batchId: string; jobId: string; error: string }>
    ) => {
      const batch = state.batches[action.payload.batchId];
      if (batch) {
        batch.jobErrors[action.payload.jobId] = action.payload.error;
      }
    },

    /** Remove a batch */
    removeBatch: (state, action: PayloadAction<string>) => {
      delete state.batches[action.payload];
      state.order = state.order.filter((id) => id !== action.payload);
      if (state.activeBatchId === action.payload) {
        state.activeBatchId = state.order[0] ?? undefined;
      }
    },

    /** Clear all batches */
    clearAllBatches: (state) => {
      state.batches = {};
      state.order = [];
      state.activeBatchId = undefined;
    },

    /** Set active batch */
    setActiveBatch: (state, action: PayloadAction<string | undefined>) => {
      state.activeBatchId = action.payload;
    },
  },
});

export const {
  createBatch,
  setBatchStatus,
  addBatchJob,
  updateBatchJobCount,
  setOutputBytes,
  recordJobError,
  removeBatch,
  clearAllBatches,
  setActiveBatch,
} = batchesSlice.actions;

export default batchesSlice.reducer;
