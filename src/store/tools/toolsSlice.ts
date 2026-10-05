import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ToolStatus, Capabilities } from "@/lib/executor/types";
import { getExecutor } from "@/lib/executor";

export interface ToolsSliceState {
  status: ToolStatus[];
  capabilities: Capabilities;
  loading: boolean;
  error: string | null;
}

const initialState: ToolsSliceState = {
  status: [],
  capabilities: {
    videoEncoders: [],
    audioEncoders: [],
  },
  loading: false,
  error: null,
};

export const fetchToolStatus = createAsyncThunk(
  "tools/fetchStatus",
  async () => {
    const executor = getExecutor();
    const status = await executor.tools.status();
    const capabilities = await executor.tools.capabilities();
    return { status, capabilities };
  }
);

export const toolsSlice = createSlice({
  name: "tools",
  initialState,
  reducers: {
    setToolStatus: (state, action: PayloadAction<ToolStatus[]>) => {
      state.status = action.payload;
    },
    setCapabilities: (state, action: PayloadAction<Capabilities>) => {
      state.capabilities = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchToolStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchToolStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload.status;
        state.capabilities = action.payload.capabilities;
      })
      .addCase(fetchToolStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to query tools";
      });
  },
});

export const { setToolStatus, setCapabilities } = toolsSlice.actions;
export default toolsSlice.reducer;
