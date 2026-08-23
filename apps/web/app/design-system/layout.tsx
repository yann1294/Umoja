import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@umoja/ui/styles.css";
import "../globals.css";
import { fontVariables } from "../fonts";

export const metadata: Metadata = {
  title: "Umoja development design system",
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
