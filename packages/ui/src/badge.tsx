import type { HTMLAttributes } from "react";

import { joinClassNames } from "./utils";

export const badgeVariants = [
  "neutral",
  "success",
  "warning",
  "danger",
  "info",
  "accent",
  "inverse",
] as const;
export type BadgeVariant = (typeof badgeVariants)[number];

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Semantic variants always retain visible text; colour must not be the only status cue. */
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span className={joinClassNames("u-badge", `u-badge--${variant}`, className)} {...props} />
  );
}
