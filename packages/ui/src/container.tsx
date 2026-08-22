import type { HTMLAttributes } from "react";

import { joinClassNames } from "./utils";

export const containerSizes = ["narrow", "default"] as const;
export type ContainerSize = (typeof containerSizes)[number];

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** `narrow` supports reading-heavy content; `default` uses the 78rem brand maximum. */
  size?: ContainerSize;
}

export function Container({ className, size = "default", ...props }: ContainerProps) {
  return (
    <div className={joinClassNames("u-container", `u-container--${size}`, className)} {...props} />
  );
}
