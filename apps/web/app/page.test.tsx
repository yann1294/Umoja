import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("presents the Umoja promise and foundation status accessibly", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "African expertise. One trusted force.",
      }),
    ).toBeVisible();
    expect(screen.getByRole("img", { name: "Umoja" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Platform foundation in progress");
  });
});
