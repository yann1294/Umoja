import type { ReactNode } from "react";
import "./content.css";

export default function ContentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
