import "server-only";

import { getTransactionalEmailEnvironment } from "@/lib/config/environment";
import { logInfo, logWarn } from "@/lib/observability/structured-log";

export type TransactionalEmail = Readonly<{
  to: string;
  subject: string;
  html: string;
  text: string;
  purpose: "account-invitation";
  locale: "en" | "fr";
}>;

export type DeliveryReceipt = Readonly<{ provider: "log" | "brevo" }>;

export interface TransactionalEmailClient {
  send(message: TransactionalEmail): Promise<DeliveryReceipt>;
}

type Fetch = typeof fetch;

export function createBrevoEmailClient(
  configuration: Extract<
    ReturnType<typeof getTransactionalEmailEnvironment>,
    { provider: "brevo" }
  >,
  request: Fetch = fetch,
): TransactionalEmailClient {
  return {
    async send(message) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await request("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": configuration.apiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: { email: configuration.from, name: configuration.fromName },
            to: [{ email: message.to }],
            subject: message.subject,
            htmlContent: message.html,
            textContent: message.text,
            tags: ["umoja-account-invitation", message.locale],
          }),
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          logWarn("transactional-email-delivery-failed", {
            provider: "brevo",
            purpose: message.purpose,
            locale: message.locale,
            status: response.status,
          });
          throw new Error("transactional-email-unavailable");
        }
        logInfo("transactional-email-delivery-accepted", {
          provider: "brevo",
          purpose: message.purpose,
          locale: message.locale,
        });
        return { provider: "brevo" };
      } catch (error) {
        if (error instanceof Error && error.message === "transactional-email-unavailable")
          throw error;
        logWarn("transactional-email-delivery-failed", {
          provider: "brevo",
          purpose: message.purpose,
          locale: message.locale,
          category: error instanceof Error && error.name === "AbortError" ? "timeout" : "network",
        });
        throw new Error("transactional-email-unavailable");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function createTransactionalEmailClient(
  source: Readonly<Record<string, string | undefined>> = process.env,
): TransactionalEmailClient {
  const configuration = getTransactionalEmailEnvironment(source);
  if (configuration.provider === "brevo") return createBrevoEmailClient(configuration);
  return {
    async send(message) {
      // Never log the recipient, content, URL, token, or a provider message identifier.
      logInfo("transactional-email-development-delivery", {
        provider: "log",
        purpose: message.purpose,
        locale: message.locale,
        delivery: "suppressed",
      });
      return { provider: "log" };
    },
  };
}
