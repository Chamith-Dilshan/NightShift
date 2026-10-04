import type { Metadata } from "next";
import "./globals.css";
import { monotonFont, proFont } from "./fonts";
import ReduxProvider from "@/store/ReduxProvider";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "NightShift Tool",
  description: "A cool tool kit to use ffmpeg and webp tool with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className={`${proFont.variable} ${monotonFont.variable} antialiased`}
      >
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
