import type { HTMLAttributes } from "react";

import { joinClassNames } from "./utils";

export const cardTones = ["white", "sand", "canvas", "dark"] as const;
export const cardPaddings = ["compact", "default", "spacious"] as const;

export type CardTone = (typeof cardTones)[number];
export type CardPadding = (typeof cardPaddings)[number];

export interface CardProps extends HTMLAttributes<HTMLElement> {
  tone?: CardTone;
  padding?: CardPadding;
}

export function Card({ className, padding = "default", tone = "white", ...props }: CardProps) {
  return (
    <article
      className={joinClassNames("u-card", `u-card--${tone}`, `u-card--${padding}`, className)}
      {...props}
    />
  );
}
