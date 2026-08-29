import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PublicHeader, type PublicNavigationItem } from "./public-header";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    locale,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    href: string;
    locale?: string;
  }) => (
    <a href={locale ? `/${locale}${href === "/" ? "" : href}` : href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/about",
}));

const items: PublicNavigationItem[] = [
  { href: "/services", label: "Services", emphasis: false },
  { href: "/work", label: "Work", emphasis: false },
  { href: "/talent", label: "Talent", emphasis: false },
  { href: "/africit", label: "AfricIT", emphasis: false },
  { href: "/about", label: "About", emphasis: false },
  { href: "/start-a-project", label: "Start a project", emphasis: true },
  { href: "/join", label: "Join", emphasis: true },
];

const labels = {
  home: "Umoja home",
  language: "Language",
  menuClose: "Close menu",
  menuOpen: "Open menu",
  menuTitle: "Main navigation",
  switchLanguage: "Français",
};

describe("PublicHeader", () => {
  it("exposes every public destination and preserves the page in the locale link", () => {
    render(<PublicHeader items={items} labels={labels} locale="en" />);

    for (const item of items) {
      expect(screen.getAllByRole("link", { name: item.label }).length).toBeGreaterThan(0);
    }

    expect(screen.getByRole("link", { name: "Language: Français" })).toHaveAttribute(
      "href",
      "/fr/about",
    );
  });

  it("opens the modal at its close control and restores focus after Escape", async () => {
    render(<PublicHeader items={items} labels={labels} locale="en" />);
    const trigger = screen.getByRole("button", { name: "Open menu" });

    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Main navigation" });

    await waitFor(() => expect(screen.getByRole("button", { name: "Close menu" })).toHaveFocus());
    expect(dialog).toHaveAttribute("open");

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
