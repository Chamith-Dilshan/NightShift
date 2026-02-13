import { configureStore } from "@reduxjs/toolkit";
import { videoSlice } from "./slices/videoSlice";

export const videoStore = configureStore({
  reducer: {
    videoTool: videoSlice.reducer,
  },
});

export type VideoRootState = ReturnType<typeof videoStore.getState>;
export type VideoAppDispatch = typeof videoStore.dispatch;