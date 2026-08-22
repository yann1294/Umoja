/* eslint-disable @next/next/no-img-element -- This framework-neutral primitive renders the supplied static SVG artwork. */
import type { ImgHTMLAttributes } from "react";

import { joinClassNames } from "./utils";

export const logoVariants = ["full", "mark", "mono"] as const;
export const logoSizes = ["small", "medium", "large"] as const;

export type LogoVariant = (typeof logoVariants)[number];
export type LogoSize = (typeof logoSizes)[number];

export interface LogoProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "height" | "src" | "width"
> {
  /** Use `decorative` only when nearby text already identifies Umoja. */
  decorative?: boolean;
  label?: string;
  variant?: LogoVariant;
  size?: LogoSize;
}

const logoSources: Record<LogoVariant, { src: string; width: number; height: number }> = {
  full: { src: "/brand/umoja-logo.svg", width: 640, height: 180 },
  mark: { src: "/brand/umoja-mark.svg", width: 256, height: 256 },
  mono: { src: "/brand/umoja-logo-mono.svg", width: 640, height: 180 },
};

export function Logo({
  className,
  decorative = false,
  label = "Umoja",
  loading = "eager",
  size = "medium",
  variant = "full",
  ...props
}: LogoProps) {
  const source = logoSources[variant];

  return (
    <img
      className={joinClassNames("u-logo", `u-logo--${variant}`, `u-logo--${size}`, className)}
      src={source.src}
      width={source.width}
      height={source.height}
      alt={decorative ? "" : label}
      aria-hidden={decorative || undefined}
      loading={loading}
      {...props}
    />
  );
}
