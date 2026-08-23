import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Badge,
  badgeVariants,
  Button,
  buttonSizes,
  buttonVariants,
  Card,
  CheckboxField,
  Container,
  LinkButton,
  Logo,
  logoVariants,
  Section,
  SelectField,
  TextAreaField,
  TextField,
  VisuallyHidden,
} from "../src";

describe("interactive primitives", () => {
  it.each(buttonVariants)("renders the %s button variant with its accessible name", (variant) => {
    render(<Button variant={variant}>{variant} action</Button>);

    expect(screen.getByRole("button", { name: `${variant} action` })).toHaveClass(
      `u-button--${variant}`,
    );
  });

  it.each(buttonSizes)("renders the %s button size", (size) => {
    render(<Button size={size}>{size} action</Button>);

    expect(screen.getByRole("button", { name: `${size} action` })).toHaveClass(`u-button--${size}`);
  });

  it("announces a loading label and prevents repeat submission", () => {
    render(
      <Button loading loadingLabel="Envoi sécurisé…">
        Envoyer
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Envoi sécurisé…" })).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("renders a link button with link semantics and an accessible name", () => {
    render(
      <LinkButton href="/join" variant="highlight">
        Join the network
      </LinkButton>,
    );

    expect(screen.getByRole("link", { name: "Join the network" })).toHaveAttribute("href", "/join");
  });

  it("allows visually hidden text to name an icon-only button", () => {
    render(
      <Button variant="ghost">
        <span aria-hidden="true">☰</span>
        <VisuallyHidden>Open navigation</VisuallyHidden>
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Open navigation" })).toBeVisible();
  });

  it("connects form labels, hints, errors, and invalid state", () => {
    render(
      <>
        <TextField id="email" label="Private email" hint="Never public" error="Use a valid email" />
        <TextAreaField id="need" label="Project need" />
        <SelectField id="country" label="Country">
          <option>Senegal</option>
        </SelectField>
        <CheckboxField id="consent" label="I consent" />
      </>,
    );

    expect(screen.getByRole("textbox", { name: "Private email" })).toHaveAccessibleDescription(
      "Never public Use a valid email",
    );
    expect(screen.getByRole("textbox", { name: "Private email" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Project need" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Country" })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "I consent" })).toBeVisible();
  });
});

describe("structural primitives", () => {
  it.each(badgeVariants)("renders the %s badge with visible status text", (variant) => {
    render(<Badge variant={variant}>{variant} status</Badge>);

    expect(screen.getByText(`${variant} status`)).toHaveClass(`u-badge--${variant}`);
  });

  it.each(logoVariants)("renders the %s logo with an accessible name", (variant) => {
    render(<Logo variant={variant} label={`Umoja ${variant}`} />);

    expect(screen.getByRole("img", { name: `Umoja ${variant}` })).toHaveAttribute(
      "src",
      expect.stringContaining("/brand/umoja-"),
    );
  });

  it("removes decorative logo artwork from the accessibility tree", () => {
    render(<Logo variant="mark" decorative />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("composes container, section, and card semantics", () => {
    render(
      <Section aria-label="Capabilities" tone="sand">
        <Container size="narrow">
          <Card aria-label="Engineering">Product engineering</Card>
        </Container>
      </Section>,
    );

    expect(screen.getByRole("region", { name: "Capabilities" })).toHaveClass("u-section--sand");
    expect(screen.getByRole("article", { name: "Engineering" })).toHaveTextContent(
      "Product engineering",
    );
  });
});
