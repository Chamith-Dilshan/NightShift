import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CommandDef, ParamDef } from "@/core/spec/schema";

export interface WorkbenchSession {
  toolId: string;
  commandId: string;
  commandDef?: CommandDef;
  mode: "params" | "raw";
  /** Params mode: key-value map of parameter values */
  params: Record<string, unknown>;
  /** Raw mode: argv tokens (without the binary) */
  rawTokens: string[];
  /** Raw mode: variable declarations */
  rawVariables?: ParamDef[];
  /** Variable values for raw mode templates */
  rawVariableValues: Record<string, unknown>;
  /** Input file paths */
  inputs: string[];
  /** Output path (may be auto-derived) */
  output?: string;
}

export interface WorkbenchState {
  /** Active sessions keyed by toolId */
  sessions: Record<string, WorkbenchSession | undefined>;
  /** Currently active toolId (for the workbench view) */
  activeToolId?: string;
}

const initialState: WorkbenchState = {
  sessions: {},
  activeToolId: undefined,
};

function createEmptySession(toolId: string, commandId: string, commandDef?: CommandDef): WorkbenchSession {
  // Initialize params from command defaults
  const params: Record<string, unknown> = {};
  if (commandDef) {
    for (const param of commandDef.params) {
      if (param.default !== undefined) {
        params[param.id] = param.default;
      }
    }
  }

  return {
    toolId,
    commandId,
    commandDef,
    mode: "params",
    params,
    rawTokens: [],
    rawVariableValues: {},
    inputs: [],
  };
}

export const workbenchSlice = createSlice({
  name: "workbench",
  initialState,
  reducers: {
    /** Open a tool workbench, creating a session if needed */
    openTool: (
      state,
      action: PayloadAction<{ toolId: string; commandId?: string; commandDef?: CommandDef }>
    ) => {
      const { toolId, commandId = "default", commandDef } = action.payload;
      state.activeToolId = toolId;

      const existing = state.sessions[toolId];
      if (!existing) {
        state.sessions[toolId] = createEmptySession(toolId, commandId, commandDef);
      } else if (commandDef && !existing.commandDef) {
        existing.commandDef = commandDef;
        // Reinitialize params if commandDef was just added
        for (const param of commandDef.params) {
          if (param.default !== undefined && !(param.id in existing.params)) {
            existing.params[param.id] = param.default;
          }
        }
      }
    },

    /** Switch the active command within a tool */
    switchCommand: (
      state,
      action: PayloadAction<{ commandId: string; commandDef?: CommandDef }>
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;

      const { commandId, commandDef } = action.payload;
      session.commandId = commandId;
      session.commandDef = commandDef;

      // Reset params to defaults
      const params: Record<string, unknown> = {};
      if (commandDef) {
        for (const param of commandDef.params) {
          if (param.default !== undefined) {
            params[param.id] = param.default;
          }
        }
      }
      session.params = params;
    },

    /** Set a parameter value */
    setParam: (
      state,
      action: PayloadAction<{ paramId: string; value: unknown }>
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      session.params[action.payload.paramId] = action.payload.value;
    },

    /** Switch between params and raw mode */
    setMode: (
      state,
      action: PayloadAction<"params" | "raw">
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      session.mode = action.payload;
    },

    /** Set raw tokens (argv) */
    setRawTokens: (
      state,
      action: PayloadAction<string[]>
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      session.rawTokens = action.payload;
    },

    /** Set raw variables definition */
    setRawVariables: (
      state,
      action: PayloadAction<ParamDef[]>
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      session.rawVariables = action.payload;
    },

    /** Set a raw variable value */
    setRawVariableValue: (
      state,
      action: PayloadAction<{ variableId: string; value: unknown }>
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      session.rawVariableValues[action.payload.variableId] = action.payload.value;
    },

    /** Set input files */
    setInputs: (
      state,
      action: PayloadAction<string[]>
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      session.inputs = action.payload;
    },

    /** Add input files */
    addInputs: (
      state,
      action: PayloadAction<string[]>
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      for (const file of action.payload) {
        if (!session.inputs.includes(file)) {
          session.inputs.push(file);
        }
      }
    },

    /** Remove an input file by index */
    removeInput: (
      state,
      action: PayloadAction<number>
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      session.inputs.splice(action.payload, 1);
    },

    /** Set output path */
    setOutput: (
      state,
      action: PayloadAction<string>
    ) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      session.output = action.payload;
    },

    /** Clear the active tool */
    closeTool: (state) => {
      state.activeToolId = undefined;
    },

    /** Reset the active session to defaults */
    resetSession: (state) => {
      const session = state.sessions[state.activeToolId!];
      if (!session) return;
      const params: Record<string, unknown> = {};
      if (session.commandDef) {
        for (const param of session.commandDef.params) {
          if (param.default !== undefined) {
            params[param.id] = param.default;
          }
        }
      }
      session.params = params;
      session.inputs = [];
      session.output = undefined;
    },
  },
});

export const {
  openTool,
  switchCommand,
  setParam,
  setMode,
  setRawTokens,
  setRawVariables,
  setRawVariableValue,
  setInputs,
  addInputs,
  removeInput,
  setOutput,
  closeTool,
  resetSession,
} = workbenchSlice.actions;

export default workbenchSlice.reducer;
