import { Container, Logo, VisuallyHidden } from "@umoja/ui";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

import { PublicHeader, type PublicNavigationItem } from "./public-header";
import { PublicShellBoundary } from "./public-shell-boundary";
import styles from "./public-shell.module.css";

type PublicShellProps = Readonly<{
  children: ReactNode;
  locale: AppLocale;
}>;

const navigation = [
  ["services", "/services"],
  ["work", "/work"],
  ["talent", "/talent"],
  ["africit", "/africit"],
  ["about", "/about"],
  ["startProject", "/start-a-project"],
  ["join", "/join"],
] as const;

export async function PublicShell({ children, locale }: PublicShellProps) {
  const shell = await getTranslations({ locale, namespace: "Shell" });
  const nav = await getTranslations({ locale, namespace: "Navigation" });
  const items: PublicNavigationItem[] = navigation.map(([key, href], index) => ({
    href,
    label: nav(key),
    emphasis: index >= navigation.length - 2,
  }));

  const headerLabels = {
    home: shell("homeLabel"),
    language: shell("languageLabel"),
    menuClose: shell("menuClose"),
    menuOpen: shell("menuOpen"),
    menuTitle: shell("menuTitle"),
    switchLanguage: shell("switchLanguage"),
  };

  const header = <PublicHeader items={items} labels={headerLabels} locale={locale} />;
  const footer = (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href="/" aria-label={shell("homeLabel")}>
              <Logo variant="mono" size="medium" decorative />
              <VisuallyHidden>{shell("homeLabel")}</VisuallyHidden>
            </Link>
            <p>{shell("footerStatement")}</p>
            <p className={styles.footerNote}>{shell("footerLanguageNote")}</p>
          </div>
          <FooterNavigation
            title={shell("footerExplore")}
            items={items.slice(0, 5)}
            label={shell("menuTitle")}
          />
          <FooterNavigation
            title={shell("footerAct")}
            items={items.slice(5)}
            label={shell("footerAct")}
          />
        </div>
      </Container>
    </footer>
  );

  return (
    <PublicShellBoundary header={header} footer={footer} skipLabel={shell("skip")}>
      {children}
    </PublicShellBoundary>
  );
}

function FooterNavigation({
  items,
  label,
  title,
}: Readonly<{ items: PublicNavigationItem[]; label: string; title: string }>) {
  return (
    <nav aria-label={label}>
      <h2 className={styles.footerHeading}>{title}</h2>
      <ul className={styles.footerLinks}>
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
