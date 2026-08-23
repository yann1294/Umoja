import { describe, expect, it } from "vitest";

import type { WorkspaceUser } from "@/lib/appwrite/auth";
import { getWorkspaceNavigation } from "./workspace-shell";

function user(roles: WorkspaceUser["roles"]): WorkspaceUser {
  return {
    id: "test",
    name: "Test member",
    email: "test@example.invalid",
    emailVerified: true,
    mfaEnabled: false,
    roles,
  };
}

describe("getWorkspaceNavigation", () => {
  it("shows administration only to the operations administrator", () => {
    expect(getWorkspaceNavigation(user(["reviewer"]), "en").map(({ href }) => href)).toEqual([
      "/workspace",
    ]);
    expect(getWorkspaceNavigation(user(["admin"]), "en").map(({ href }) => href)).toEqual([
      "/workspace",
      "/admin",
      "/admin/content",
    ]);
    expect(getWorkspaceNavigation(user(["cms-editor"]), "en").map(({ href }) => href)).toEqual([
      "/workspace",
      "/admin/content",
    ]);
  });

  it("uses concise structurally equivalent bilingual labels", () => {
    expect(getWorkspaceNavigation(user(["admin"]), "fr").map(({ label }) => label)).toEqual([
      "Vue d’ensemble",
      "Opérations",
      "Contenu public",
    ]);
  });
});
