"use client";

import { Logo, VisuallyHidden } from "@umoja/ui";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

import styles from "./public-shell.module.css";

export type PublicNavigationItem = Readonly<{
  href: string;
  label: string;
  emphasis: boolean;
}>;

type PublicHeaderProps = Readonly<{
  items: PublicNavigationItem[];
  labels: {
    home: string;
    language: string;
    menuClose: string;
    menuOpen: string;
    menuTitle: string;
    switchLanguage: string;
  };
  locale: AppLocale;
}>;

export function PublicHeader({ items, labels, locale }: PublicHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const nextLocale: AppLocale = locale === "en" ? "fr" : "en";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function closeMenu({ restoreFocus = true } = {}) {
    setIsOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    const first = focusable.at(0);
    const last = focusable.at(-1);

    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.logoLink} href="/" aria-label={labels.home}>
          <Logo variant="full" size="small" decorative />
          <VisuallyHidden>{labels.home}</VisuallyHidden>
        </Link>

        <nav className={styles.desktopNavigation} aria-label={labels.menuTitle}>
          <NavigationList items={items} />
        </nav>

        <div className={styles.headerActions}>
          <Link
            className={styles.languageLink}
            href={pathname}
            locale={nextLocale}
            hrefLang={nextLocale}
            aria-label={`${labels.language}: ${labels.switchLanguage}`}
          >
            <span aria-hidden="true">{nextLocale.toUpperCase()}</span>
            <span className={styles.languageName}>{labels.switchLanguage}</span>
          </Link>
          <button
            ref={menuButtonRef}
            className={styles.menuButton}
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-controls="mobile-navigation"
            onClick={() => setIsOpen(true)}
          >
            <MenuIcon />
            <VisuallyHidden>{labels.menuOpen}</VisuallyHidden>
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        id="mobile-navigation"
        className={styles.mobileDialog}
        aria-labelledby="mobile-navigation-title"
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClose={() => {
          setIsOpen(false);
          menuButtonRef.current?.focus();
        }}
        onKeyDown={trapFocus}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className={styles.dialogPanel}>
          <div className={styles.dialogHeader}>
            <h2 id="mobile-navigation-title">{labels.menuTitle}</h2>
            <button
              ref={closeButtonRef}
              className={styles.closeButton}
              type="button"
              onClick={() => closeMenu()}
            >
              <CloseIcon />
              <VisuallyHidden>{labels.menuClose}</VisuallyHidden>
            </button>
          </div>
          <nav aria-label={labels.menuTitle}>
            <NavigationList
              items={items}
              mobile
              onNavigate={() => closeMenu({ restoreFocus: false })}
            />
          </nav>
          <Link
            className={styles.dialogLanguageLink}
            href={pathname}
            locale={nextLocale}
            hrefLang={nextLocale}
            onClick={() => closeMenu({ restoreFocus: false })}
          >
            <span>{labels.language}</span>
            <strong>{labels.switchLanguage}</strong>
          </Link>
        </div>
      </dialog>
    </header>
  );
}

function NavigationList({
  items,
  mobile = false,
  onNavigate,
}: Readonly<{
  items: PublicNavigationItem[];
  mobile?: boolean;
  onNavigate?: () => void;
}>) {
  return (
    <ul className={mobile ? styles.mobileNavigationList : styles.desktopNavigationList}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            className={item.emphasis ? styles.emphasizedNavigationLink : styles.navigationLink}
            href={item.href}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
