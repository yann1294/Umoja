import type { ButtonHTMLAttributes, ReactNode } from "react";

import { joinClassNames } from "./utils";

export const buttonVariants = [
  "primary",
  "secondary",
  "highlight",
  "ghost",
  "inverse",
  "danger",
] as const;
export const buttonSizes = ["small", "medium", "large"] as const;

export type ButtonVariant = (typeof buttonVariants)[number];
export type ButtonSize = (typeof buttonSizes)[number];

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual treatment. Use `inverse` on Canopy or Ink surfaces. */
  variant?: ButtonVariant;
  /** All sizes retain the minimum 44px touch target. */
  size?: ButtonSize;
  /** Disables the control, announces busy state, and swaps in `loadingLabel`. */
  loading?: boolean;
  loadingLabel?: ReactNode;
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  loadingLabel = "Loading…",
  size = "medium",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={joinClassNames("u-button", `u-button--${variant}`, `u-button--${size}`, className)}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="u-button__spinner" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
