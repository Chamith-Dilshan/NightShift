import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface JobItem {
  id: string;
  inputPath: string;
  outputPath: string;
  argv: string[];
  status: JobStatus;
  percent: number;
  speed: number | null;
  fps: number | null;
  bitrateKbps: number | null;
  exitCode?: number | null;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  errorSummary?: string | null;
}

export interface JobsSliceState {
  jobs: Record<string, JobItem>;
  order: string[];
  runningJobId: string | null;
  isQueueRunning: boolean;
}

const initialState: JobsSliceState = {
  jobs: {},
  order: [],
  runningJobId: null,
  isQueueRunning: false,
};

export const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    enqueueJobs: (state, action: PayloadAction<JobItem[]>) => {
      for (const item of action.payload) {
        state.jobs[item.id] = item;
        if (!state.order.includes(item.id)) {
          state.order.push(item.id);
        }
      }
    },
    updateJobProgress: (
      state,
      action: PayloadAction<{
        id: string;
        percent?: number | null;
        speed?: number | null;
        fps?: number | null;
        bitrateKbps?: number | null;
      }>
    ) => {
      const job = state.jobs[action.payload.id];
      if (job) {
        if (action.payload.percent != null) job.percent = action.payload.percent;
        if (action.payload.speed !== undefined) job.speed = action.payload.speed;
        if (action.payload.fps !== undefined) job.fps = action.payload.fps;
        if (action.payload.bitrateKbps !== undefined) job.bitrateKbps = action.payload.bitrateKbps;
      }
    },
    setJobRunning: (state, action: PayloadAction<string>) => {
      state.runningJobId = action.payload;
      state.isQueueRunning = true;
      const job = state.jobs[action.payload];
      if (job) {
        job.status = "running";
        job.startedAt = Date.now();
      }
    },
    setJobFinished: (
      state,
      action: PayloadAction<{
        id: string;
        status: JobStatus;
        exitCode?: number | null;
        durationMs?: number;
        errorSummary?: string | null;
      }>
    ) => {
      const job = state.jobs[action.payload.id];
      if (job) {
        job.status = action.payload.status;
        job.exitCode = action.payload.exitCode;
        job.durationMs = action.payload.durationMs;
        job.errorSummary = action.payload.errorSummary;
        job.finishedAt = Date.now();
        if (action.payload.status === "done") {
          job.percent = 100;
        }
      }
      if (state.runningJobId === action.payload.id) {
        state.runningJobId = null;
      }
    },
    setQueueRunning: (state, action: PayloadAction<boolean>) => {
      state.isQueueRunning = action.payload;
      if (!action.payload) {
        state.runningJobId = null;
      }
    },
    retryJob: (state, action: PayloadAction<string>) => {
      const job = state.jobs[action.payload];
      if (job) {
        job.status = "queued";
        job.percent = 0;
        job.speed = null;
        job.fps = null;
        job.bitrateKbps = null;
        job.exitCode = undefined;
        job.errorSummary = null;
        job.durationMs = undefined;
      }
    },
    removeJob: (state, action: PayloadAction<string>) => {
      delete state.jobs[action.payload];
      state.order = state.order.filter((id) => id !== action.payload);
      if (state.runningJobId === action.payload) {
        state.runningJobId = null;
      }
    },
    clearAllJobs: (state) => {
      state.jobs = {};
      state.order = [];
      state.runningJobId = null;
      state.isQueueRunning = false;
    },
  },
});

export const {
  enqueueJobs,
  updateJobProgress,
  setJobRunning,
  setJobFinished,
  setQueueRunning,
  retryJob,
  removeJob,
  clearAllJobs,
} = jobsSlice.actions;

export default jobsSlice.reducer;
