import { describe, expect, it, vi } from "vitest";
import { createBrevoEmailClient, createTransactionalEmailClient } from "./client";

const apiKey = "test-api-key-with-enough-length";
const message = {
  to: "synthetic@example.test",
  subject: "Invitation",
  html: '<a href="https://umoja.example.test/accept?token=sensitive">Accept</a>',
  text: "https://umoja.example.test/accept?token=sensitive",
  purpose: "account-invitation" as const,
  locale: "en" as const,
};

describe("Brevo transactional email adapter", () => {
  it("uses the documented API boundary without returning provider identifiers", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response('{"messageId":"private-id"}', { status: 201 }));
    const client = createBrevoEmailClient(
      { provider: "brevo", apiKey, from: "hello@example.test", fromName: "Umoja" },
      request,
    );
    await expect(client.send(message)).resolves.toEqual({ provider: "brevo" });
    expect(request).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
    const options = request.mock.calls[0][1];
    expect(options.headers["api-key"]).toBe(apiKey);
    expect(JSON.parse(options.body)).toMatchObject({
      to: [{ email: message.to }],
      textContent: message.text,
    });
  });

  it("maps provider rejection to a generic delivery failure", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response("provider private body", { status: 401 }));
    const client = createBrevoEmailClient(
      { provider: "brevo", apiKey, from: "hello@example.test", fromName: "Umoja" },
      request,
    );
    await expect(client.send(message)).rejects.toThrow("transactional-email-unavailable");
  });

  it("logs only a redacted summary in local delivery mode", async () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const client = createTransactionalEmailClient({
      NODE_ENV: "development",
      UMOJA_EMAIL_PROVIDER: "log",
      UMOJA_EMAIL_FROM: "hello@example.test",
    });
    await client.send(message);
    const serialized = JSON.stringify(output.mock.calls);
    expect(serialized).not.toContain(message.to);
    expect(serialized).not.toContain("token=sensitive");
    expect(serialized).not.toContain(message.html);
    output.mockRestore();
  });
});
