import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthenticatedShell } from "./authenticated-shell";
import type { WorkspaceNavigationItem } from "./workspace-shell";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

const navigation: readonly WorkspaceNavigationItem[] = [
  { href: "/workspace", label: "Overview", section: "workspace" },
  { href: "/admin", label: "Operations", section: "administration" },
];
const user = {
  id: "test-user",
  name: "A Very Long Preferred Workspace Name",
  email: "private-account-address@example.invalid",
  emailVerified: true,
  mfaEnabled: false,
  roles: ["admin", "reviewer"] as const,
};

function renderShell(sessionState: "active" | "stale" = "active") {
  return render(
    <AuthenticatedShell
      current="workspace"
      locale="en"
      navigation={navigation}
      sessionState={sessionState}
      user={user}
    >
      <h1>Workspace test</h1>
    </AuthenticatedShell>,
  );
}

describe("AuthenticatedShell", () => {
  it("marks the current route and keeps unauthorized routes out of supplied navigation", () => {
    renderShell();
    const desktopNavigation = screen.getAllByRole("navigation", {
      name: "Workspace navigation",
    })[0]!;
    expect(within(desktopNavigation).getByRole("link", { name: /Overview/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("link", { name: /Governance/ })).not.toBeInTheDocument();
  });

  it("keeps the complete email inside the account menu and restores trigger focus on Escape", async () => {
    renderShell();
    expect(screen.queryByText(user.email)).not.toBeInTheDocument();
    const trigger = screen.getAllByRole("button", { name: "Open account menu" })[0]!;
    fireEvent.click(trigger);
    expect(screen.getByText(user.email)).toBeVisible();
    const menu = screen.getByRole("dialog", { name: "Account and session" });
    fireEvent.keyDown(menu.parentElement!, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByText(user.email)).not.toBeInTheDocument();
  });

  it("opens a modal navigation drawer and restores trigger focus", async () => {
    renderShell();
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Workspace navigation" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close navigation" })).toHaveFocus(),
    );
    expect(dialog).toHaveAttribute("open");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("shows session refresh only when the session is stale and keeps sign-out named", () => {
    renderShell("stale");
    fireEvent.click(screen.getAllByRole("button", { name: "Open account menu" })[0]!);
    expect(screen.getByRole("button", { name: "Check session" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
