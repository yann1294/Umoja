import type { HTMLAttributes } from "react";

import { joinClassNames } from "./utils";

export const sectionTones = ["canvas", "sand", "canopy", "ink"] as const;
export const sectionSpacings = ["compact", "default", "spacious"] as const;

export type SectionTone = (typeof sectionTones)[number];
export type SectionSpacing = (typeof sectionSpacings)[number];

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  tone?: SectionTone;
  spacing?: SectionSpacing;
}

export function Section({
  className,
  spacing = "default",
  tone = "canvas",
  ...props
}: SectionProps) {
  return (
    <section
      className={joinClassNames(
        "u-section",
        `u-section--${tone}`,
        `u-section--${spacing}`,
        className,
      )}
      {...props}
    />
  );
}
