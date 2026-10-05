"use client";

import { Provider } from "react-redux";
import { store } from "./store";
import { Hydrator } from "./persistence/hydrate";

const ReduxProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Provider store={store}>
      <Hydrator />
      {children}
    </Provider>
  );
};

export default ReduxProvider;
