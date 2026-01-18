import localFont from "next/font/local";

export const proFont = localFont({
  src: "./fonts/ProFont.woff",
  variable: "--font-profont",
  fallback: ["system-ui", "sans-serif"],
});