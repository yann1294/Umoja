import { Badge, Container, LinkButton, Section } from "@umoja/ui";
import type { EditorialPage, ServiceCategory } from "@umoja/validation";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { localize } from "@/content/public-content";

import styles from "./public-content.module.css";

export type BreadcrumbItem = Readonly<{ label: string; href?: string }>;

export function Breadcrumbs({
  ariaLabel,
  items,
}: Readonly<{ ariaLabel: string; items: readonly BreadcrumbItem[] }>) {
  return (
    <nav className={styles.breadcrumbs} aria-label={ariaLabel}>
      <Container>
        <ol>
          {items.map((item) => (
            <li key={`${item.href ?? "current"}-${item.label}`}>
              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </Container>
    </nav>
  );
}

export function ContentHero({
  eyebrow,
  illustrativeLabel,
  summary,
  title,
}: Readonly<{ eyebrow: string; illustrativeLabel?: string; summary: string; title: string }>) {
  return (
    <Section
      className={styles.contentHero}
      tone="canopy"
      spacing="spacious"
      aria-labelledby="content-title"
    >
      <Container>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 id="content-title">{title}</h1>
            <p>{summary}</p>
            {illustrativeLabel ? (
              <div className={styles.heroLabel}>
                <Badge variant="inverse">{illustrativeLabel}</Badge>
              </div>
            ) : null}
          </div>
          <div className={styles.heroGraphic} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function SectionHeading({
  description,
  title,
}: Readonly<{ description: string; title: string }>) {
  return (
    <div className={styles.sectionHeading}>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function ServiceCards({
  actionLabel,
  locale,
  services,
}: Readonly<{ actionLabel: string; locale: AppLocale; services: readonly ServiceCategory[] }>) {
  return (
    <ul className={styles.cardGrid}>
      {services.map((service) => (
        <li className={styles.serviceCard} key={service.slug}>
          <h2>{localize(service.title, locale)}</h2>
          <p>{localize(service.summary, locale)}</p>
          <LinkButton href={`/${locale}/services/${service.slug}`} variant="secondary">
            {actionLabel}
          </LinkButton>
        </li>
      ))}
    </ul>
  );
}

export function ContentState({
  children,
  description,
  state = "empty",
  title,
}: Readonly<{
  children?: ReactNode;
  description: string;
  state?: "empty" | "loading" | "error";
  title: string;
}>) {
  return (
    <div
      className={styles.statePanel}
      data-content-state={state}
      data-state={state}
      aria-busy={state === "loading"}
    >
      <span className={styles.stateMark} aria-hidden="true">
        {state === "error" ? "!" : state === "loading" ? "···" : "—"}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}

export function EditorialPageView({
  action,
  locale,
  page,
}: Readonly<{
  action?: Readonly<{ href: string; label: string }>;
  locale: AppLocale;
  page: EditorialPage;
}>) {
  return (
    <>
      <ContentHero
        eyebrow={localize(page.eyebrow, locale)}
        title={localize(page.title, locale)}
        summary={localize(page.summary, locale)}
      />
      <Section aria-label={localize(page.title, locale)}>
        <Container>
          <div className={styles.featureGrid}>
            {page.sections.map((section) => (
              <article className={styles.featureCard} key={localize(section.title, locale)}>
                <h2>{localize(section.title, locale)}</h2>
                <p>{localize(section.body, locale)}</p>
              </article>
            ))}
          </div>
          {action ? (
            <div className={styles.actionRow}>
              <LinkButton href={action.href} variant="primary">
                {action.label}
              </LinkButton>
            </div>
          ) : null}
        </Container>
      </Section>
    </>
  );
}

export { styles as publicContentStyles };
