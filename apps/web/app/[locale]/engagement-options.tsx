import { LinkButton } from "@umoja/ui";

import styles from "./engagement-options.module.css";

export type EngagementOption = Readonly<{
  action: string;
  description: string;
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
          <span className={styles.mark} aria-hidden="true">
            ↗
          </span>
          <h3>{option.title}</h3>
          <p>{option.description}</p>
          <LinkButton href={option.href} variant="secondary">
            {option.action}
          </LinkButton>
        </article>
      ))}
    </div>
  );
}
