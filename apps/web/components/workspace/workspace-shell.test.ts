import { describe, expect, it } from "vitest";

import type { SupabaseWorkspaceUser as WorkspaceUser } from "@/lib/supabase/auth";
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
  it("shows only the administration areas authorized for each role", () => {
    expect(getWorkspaceNavigation(user(["reviewer"]), "en").map(({ href }) => href)).toEqual([
      "/workspace",
      "/workspace/profile",
      "/workspace/skills",
      "/workspace/portfolio",
      "/workspace/availability",
      "/admin/intake",
    ]);
    expect(getWorkspaceNavigation(user(["admin"]), "en").map(({ href }) => href)).toEqual([
      "/workspace",
      "/workspace/profile",
      "/workspace/skills",
      "/workspace/portfolio",
      "/workspace/availability",
      "/admin",
      "/admin/intake",
      "/admin/profiles",
      "/admin/content",
    ]);
    expect(getWorkspaceNavigation(user(["cms-editor"]), "en").map(({ href }) => href)).toEqual([
      "/workspace",
      "/workspace/profile",
      "/workspace/skills",
      "/workspace/portfolio",
      "/workspace/availability",
      "/admin/content",
    ]);
  });

  it("uses concise structurally equivalent bilingual labels", () => {
    expect(getWorkspaceNavigation(user(["admin"]), "fr").map(({ label }) => label)).toEqual([
      "Vue d’ensemble",
      "Profil",
      "Compétences",
      "Portfolio",
      "Disponibilité",
      "Opérations",
      "Demandes",
      "Profils publics",
      "Contenu public",
    ]);
  });
});
