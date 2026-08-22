import type { ReactNode } from "react";

import "@umoja/ui/styles.css";
import "../globals.css";
import { fontVariables } from "../fonts";

export default function DesignSystemLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
