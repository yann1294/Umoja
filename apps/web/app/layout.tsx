import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import "@umoja/ui/styles.css";
import "./globals.css";

const manrope = localFont({
  src: "./fonts/manrope-latin-variable.woff2",
  variable: "--font-manrope",
  weight: "600 800",
  display: "swap",
});

const notoSans = localFont({
  src: "./fonts/noto-sans-latin-variable.woff2",
  variable: "--font-noto-sans",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Umoja",
  description: "African expertise. One trusted force.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${notoSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
