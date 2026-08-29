"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./public-shell.module.css";

export function PublicShellBoundary({
  children,
  footer,
  header,
  skipLabel,
}: Readonly<{
  children: ReactNode;
  footer: ReactNode;
  header: ReactNode;
  skipLabel: string;
}>) {
  const pathname = usePathname();
  const privateRoute = /^\/(?:en|fr)\/(?:workspace|admin)(?:\/|$)/.test(pathname);

  return (
    <>
      <a className={styles.skipLink} href="#main-content">
        {skipLabel}
      </a>
      {privateRoute ? null : header}
      <main id="main-content" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      {privateRoute ? null : footer}
    </>
  );
}
