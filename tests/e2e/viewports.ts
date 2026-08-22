import type { ViewportSize } from "@playwright/test";

export type ResponsiveViewport = Readonly<{
  name: string;
  viewport: ViewportSize;
}>;

export const REQUIRED_VIEWPORT_WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440, 1920] as const;

export const RESPONSIVE_VIEWPORTS: readonly ResponsiveViewport[] = [
  { name: "width-320", viewport: { width: 320, height: 568 } },
  { name: "width-360", viewport: { width: 360, height: 800 } },
  { name: "width-390", viewport: { width: 390, height: 844 } },
  { name: "width-768", viewport: { width: 768, height: 1024 } },
  { name: "width-1024", viewport: { width: 1024, height: 768 } },
  { name: "width-1280", viewport: { width: 1280, height: 900 } },
  { name: "width-1440", viewport: { width: 1440, height: 900 } },
  { name: "width-1920", viewport: { width: 1920, height: 1080 } },
  { name: "wide-2560", viewport: { width: 2560, height: 1440 } },
  { name: "phone-landscape", viewport: { width: 844, height: 390 } },
  { name: "tablet-landscape", viewport: { width: 1180, height: 820 } },
] as const;
