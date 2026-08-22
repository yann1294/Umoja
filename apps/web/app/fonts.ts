import localFont from "next/font/local";

export const manrope = localFont({
  src: "./fonts/manrope-latin-variable.woff2",
  variable: "--font-manrope",
  weight: "600 800",
  display: "swap",
});

export const notoSans = localFont({
  src: "./fonts/noto-sans-latin-variable.woff2",
  variable: "--font-noto-sans",
  weight: "400 700",
  display: "swap",
});

export const fontVariables = `${manrope.variable} ${notoSans.variable}`;
