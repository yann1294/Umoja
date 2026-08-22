export const MEMBERSHIP_TIERS = ["extended", "core"] as const;

export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number];
