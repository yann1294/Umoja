import type { AnchorHTMLAttributes } from "react";

import type { ButtonSize, ButtonVariant } from "./button";
import { joinClassNames } from "./utils";

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Visual treatment. Use `inverse` on Canopy or Ink surfaces. */
  variant?: ButtonVariant;
  /** All sizes retain the minimum 44px touch target. */
  size?: ButtonSize;
}

export function LinkButton({
  className,
  size = "medium",
  variant = "primary",
  ...props
}: LinkButtonProps) {
  return (
    <a
      className={joinClassNames("u-button", `u-button--${variant}`, `u-button--${size}`, className)}
      {...props}
    />
  );
}
