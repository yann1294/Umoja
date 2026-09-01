import type { UmojaRole } from "@/lib/auth/policy";

export const roleLabels: Readonly<Record<UmojaRole, { en: string; fr: string }>> = {
  admin: { en: "Operations administrator", fr: "Administration des opérations" },
  "cms-editor": { en: "Content editor", fr: "Édition de contenu" },
  reviewer: { en: "Intake reviewer", fr: "Révision des demandes" },
  core: { en: "Core network", fr: "Réseau principal" },
  extended: { en: "Extended network", fr: "Réseau étendu" },
  "project-manager": { en: "Project manager", fr: "Gestion de projet" },
};

export function displayName(name: string, locale: "en" | "fr") {
  const value = name.trim();
  return value || (locale === "fr" ? "Membre Umoja" : "Umoja member");
}

export function initialsFor(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "U";
  const words = source.split(/\s+/).filter(Boolean);
  return (
    (words.length > 1 ? `${words[0]?.[0]}${words.at(-1)?.[0]}` : source.slice(0, 2))
      .toLocaleUpperCase()
      .replace(/[^\p{L}\p{N}]/gu, "") || "U"
  );
}
