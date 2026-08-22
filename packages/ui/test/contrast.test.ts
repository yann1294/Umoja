import { describe, expect, it } from "vitest";

import { brandColors } from "../src";

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((value) => Number.parseInt(value, 16) / 255);

  if (!channels || channels.length !== 3) {
    throw new Error(`Invalid colour: ${hex}`);
  }

  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("approved contrast combinations", () => {
  it.each([
    ["Ink on Canvas", brandColors.ink, brandColors.canvas],
    ["White on Canopy", brandColors.white, brandColors.canopy],
    ["Ink on Gold", brandColors.ink, brandColors.gold],
    ["Slate on White", brandColors.slate, brandColors.white],
    ["White on Danger", brandColors.white, brandColors.danger],
  ])("keeps %s at WCAG AA for normal text", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["White on Kijani", brandColors.white, brandColors.kijani],
    ["White on Terracotta", brandColors.white, brandColors.terracotta],
  ])("retains the documented restriction for %s", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeLessThan(4.5);
  });
});
