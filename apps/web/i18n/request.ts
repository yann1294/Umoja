import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import en from "../messages/en.json";
import fr from "../messages/fr.json";
import { routing } from "./routing";

const messages = { en, fr } as const;

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale ?? (await rootParams.locale());
  if (!hasLocale(routing.locales, resolvedLocale)) notFound();

  return {
    locale: resolvedLocale,
    messages: messages[resolvedLocale],
    onError(error) {
      if (process.env.NODE_ENV !== "production") throw error;
      console.error(error);
    },
    getMessageFallback({ error }) {
      if (process.env.NODE_ENV !== "production") throw error;
      return "";
    },
  };
});
