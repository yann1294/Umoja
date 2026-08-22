import type { HTMLAttributes } from "react";

import { joinClassNames } from "./utils";

export type VisuallyHiddenProps = HTMLAttributes<HTMLSpanElement>;

export function VisuallyHidden({ className, ...props }: VisuallyHiddenProps) {
  return <span className={joinClassNames("u-visually-hidden", className)} {...props} />;
}
