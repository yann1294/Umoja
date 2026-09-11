import { LinkButton } from "@umoja/ui";

import styles from "./engagement-options.module.css";

export type EngagementOption = Readonly<{
  action: string;
  description: string;
  details?: readonly Readonly<{ label: string; value: string }>[];
  href: string;
  id?: string;
  title: string;
}>;

export function EngagementOptions({
  compact = false,
  options,
}: Readonly<{ compact?: boolean; options: readonly EngagementOption[] }>) {
  return (
    <div className={compact ? `${styles.grid} ${styles.compactGrid}` : styles.grid}>
      {options.map((option) => (
        <article className={styles.card} id={option.id} key={option.title}>
          <div className={styles.header}>
            <h3>{option.title}</h3>
            <span className={styles.mark} aria-hidden="true">
              ↗
            </span>
          </div>
          <p>{option.description}</p>
          {option.details?.length ? (
            <dl className={styles.detailList}>
              {option.details.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <LinkButton href={option.href} variant="secondary">
            {option.action}
          </LinkButton>
        </article>
      ))}
    </div>
  );
}
