import "server-only";

export async function acceptInvitationAcrossBoundaries(options: {
  email: string;
  expectedEmailLookup: string;
  password: string;
  createEmailLookup(email: string): string;
  createAuthUser(input: {
    email: string;
    password: string;
  }): Promise<{ id: string; email: string | null }>;
  acceptDatabase(userId: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
  onCompensationFailure(userId: string): void;
}) {
  const user = await options.createAuthUser({ email: options.email, password: options.password });
  try {
    const normalized = user.email?.trim().toLowerCase();
    if (!normalized || options.createEmailLookup(normalized) !== options.expectedEmailLookup) {
      throw new Error("invitation-target-mismatch");
    }
    await options.acceptDatabase(user.id);
    return user;
  } catch {
    try {
      await options.deleteAuthUser(user.id);
    } catch {
      options.onCompensationFailure(user.id);
    }
    throw new Error("invitation-acceptance-unavailable");
  }
}
