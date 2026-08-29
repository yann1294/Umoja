export const brandColors = {
  ink: "#0b1f1a",
  canopy: "#123c2c",
  kijani: "#1f8a5b",
  gold: "#f4b942",
  terracotta: "#c85a3d",
  indigo: "#39447a",
  canvas: "#fffcf5",
  sand: "#f4edde",
  mist: "#dde5df",
  slate: "#52635d",
  white: "#ffffff",
  success: "#18794e",
  warning: "#a15c00",
  danger: "#b42318",
  info: "#285ea8",
} as const;

export type BrandColor = keyof typeof brandColors;

/** @deprecated Use `brandColors`; retained for compatibility with the initial scaffold. */
export const brandTokens = brandColors;
