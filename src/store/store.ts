import { configureStore } from "@reduxjs/toolkit";
import videoReducer from "./videoTool/videoSlice";
import templatesReducer from "./templates/templatesSlice";
import jobsReducer from "./jobs/jobsSlice";
import toolsReducer from "./tools/toolsSlice";
import { persistenceListener } from "./persistence/listener";

export const store = configureStore({
  reducer: {
    video: videoReducer,
    templates: templatesReducer,
    jobs: jobsReducer,
    tools: toolsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(persistenceListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
