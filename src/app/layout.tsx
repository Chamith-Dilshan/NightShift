import type { Metadata } from "next";
import "./globals.css";
import { monotonFont, proFont } from "./fonts";

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
    <html lang="en">
      <body
        className={`${proFont.variable} ${monotonFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
