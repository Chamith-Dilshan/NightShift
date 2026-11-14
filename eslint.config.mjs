import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Enforce that src/core/ is pure TypeScript: no React, Redux, Tauri, or browser APIs.
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react/**", "react-dom", "react-dom/**"],
              message: "src/core/ must not import React.",
            },
            {
              group: ["react-redux", "react-redux/**"],
              message: "src/core/ must not import react-redux.",
            },
            {
              group: ["@reduxjs/toolkit", "@reduxjs/toolkit/**"],
              message: "src/core/ must not import Redux Toolkit.",
            },
            {
              group: ["@tauri-apps/*", "@tauri-apps/*/**"],
              message: "src/core/ must not import Tauri.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src-tauri/**",
  ]),
]);

export default eslintConfig;
