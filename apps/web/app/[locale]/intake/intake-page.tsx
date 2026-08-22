import type { IntakeKind } from "@umoja/validation";

import { getIntakeCopy } from "@/content/intake-copy";
import type { AppLocale } from "@/i18n/routing";

import { Breadcrumbs } from "../public-content";
import { IntakeJourney } from "./intake-journey";

export function IntakePage({ kind, locale }: Readonly<{ kind: IntakeKind; locale: AppLocale }>) {
  const copy = getIntakeCopy(locale);
  const home = locale === "fr" ? "Accueil" : "Home";
  return (
    <>
      <Breadcrumbs
        ariaLabel={locale === "fr" ? "Fil d’Ariane" : "Breadcrumb"}
        items={[{ label: home, href: "/" }, { label: copy[kind].eyebrow }]}
      />
      <IntakeJourney copy={copy} kind={kind} />
    </>
  );
}
