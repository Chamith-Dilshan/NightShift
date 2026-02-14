import { configureStore } from "@reduxjs/toolkit";

import videoReducer from "./videoTool/videoSlice";
// import webpReducer from "./webpTool/webpSlice";

export const store = configureStore({
  reducer: {
    videoTool: videoReducer,
    // webpTool: webpReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
