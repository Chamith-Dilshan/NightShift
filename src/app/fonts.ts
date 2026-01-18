import localFont from "next/font/local";
import { Monoton } from "next/font/google";

export const monotonFont = Monoton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-monoton",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});


export const proFont = localFont({
  src: "./fonts/ProFont.woff",
  variable: "--font-profont",
  fallback: ["system-ui", "sans-serif"],
});