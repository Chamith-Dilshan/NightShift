import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { validateVideo, Issue, ValidationContext } from "./videoSchema";
import { resolveVideoCodec, resolveAudioCodec } from "./codecRules";
import { generateVideoCommand } from "./commandBuilder";
import { planOutputs, PlannedOutput } from "./outputPlanner";

export const selectVideoState = (state: RootState) => state.video;
export const selectVideoSettings = (state: RootState) => state.video.settings;
export const selectInputFiles = (state: RootState) => state.video.inputFiles;
export const selectProbes = (state: RootState) => state.video.probes;
export const selectCommandMode = (state: RootState) => state.video.commandMode;
export const selectManualCommand = (state: RootState) => state.video.manualCommand;

export const selectResolvedVideoCodec = createSelector(
  [selectVideoSettings],
  (settings) => resolveVideoCodec(settings.output.format, settings.video.codec)
);

export const selectResolvedAudioCodec = createSelector(
  [selectVideoSettings],
  (settings) => resolveAudioCodec(settings.output.format, settings.audio.codec)
);

export const selectPlannedOutputs = createSelector(
  [selectVideoSettings, selectInputFiles],
  (settings, inputs): PlannedOutput[] => {
    return planOutputs(settings, inputs, new Set());
  }
);

export const selectGeneratedCommand = createSelector(
  [selectVideoState, selectPlannedOutputs],
  (videoState, plannedOutputs): string[] => {
    if (videoState.commandMode === "manual") {
      return [videoState.manualCommand];
    }

    if (plannedOutputs.length === 0) {
      return generateVideoCommand(videoState.settings, {
        input: "input.mp4",
        output: "output.mp4",
      });
    }

    const first = plannedOutputs[0];
    const probe = videoState.probes[first.input];
    return generateVideoCommand(videoState.settings, {
      input: first.input,
      output: first.output,
      probe,
    });
  }
);

export const selectValidation = (ctx?: ValidationContext) =>
  createSelector([selectVideoState], (videoState): Issue[] => {
    return validateVideo(videoState, ctx);
  });
