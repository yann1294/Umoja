"use client";

import { Button } from "@umoja/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MediaUpload({ locale }: Readonly<{ locale: "en" | "fr" }>) {
  const french = locale === "fr";
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  return (
    <form
      className="cms-field-group cms-media-upload"
      onSubmit={async (event) => {
        event.preventDefault();
        setState("loading");
        setMessage("");
        const response = await fetch("/api/cms/media", {
          method: "POST",
          body: new FormData(event.currentTarget),
        }).catch(() => null);
        if (!response?.ok) {
          const body = (await response?.json().catch(() => null)) as { error?: string } | null;
          setMessage(body?.error ?? (french ? "Le téléversement a échoué." : "Upload failed."));
          setState("error");
          return;
        }
        event.currentTarget.reset();
        setState("idle");
        setMessage(
          french ? "Média ajouté comme brouillon privé." : "Media added as a private draft.",
        );
        router.refresh();
      }}
    >
      <legend>{french ? "Ajouter un média" : "Add media"}</legend>
      <p>
        {french
          ? "PNG, JPEG ou WEBP, 10 Mo maximum. Le fichier reste privé jusqu’à la publication autorisée."
          : "PNG, JPEG, or WEBP up to 10 MB. The file remains private until authorized publication."}
      </p>
      <input type="hidden" name="locale" value={locale} />
      <div className="cms-fields cms-fields-two">
        <label className="cms-field">
          <span>
            {french ? "Fichier" : "File"} <b aria-hidden="true">*</b>
          </span>
          <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
        </label>
        <label className="cms-field">
          <span>{french ? "Consentement" : "Consent"}</span>
          <select name="consentState">
            <option value="not-required">{french ? "Non requis" : "Not required"}</option>
            <option value="recorded">{french ? "Enregistré" : "Recorded"}</option>
          </select>
        </label>
        <label className="cms-field">
          <span>
            {french ? "Texte alternatif anglais" : "English alt text"} <b aria-hidden="true">*</b>
          </span>
          <input name="altEn" required maxLength={500} />
        </label>
        <label className="cms-field">
          <span>
            {french ? "Texte alternatif français" : "French alt text"} <b aria-hidden="true">*</b>
          </span>
          <input name="altFr" required maxLength={500} />
        </label>
      </div>
      {message ? <p role={state === "error" ? "alert" : "status"}>{message}</p> : null}
      <Button
        type="submit"
        loading={state === "loading"}
        loadingLabel={french ? "Téléversement…" : "Uploading…"}
      >
        {french ? "Ajouter comme brouillon" : "Add as draft"}
      </Button>
    </form>
  );
}

export function MediaReplacement({
  locale,
  pageId,
}: Readonly<{ locale: "en" | "fr"; pageId: string }>) {
  const french = locale === "fr";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="cms-media-replace"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage("");
        const response = await fetch("/api/cms/media", {
          method: "PUT",
          body: new FormData(event.currentTarget),
        }).catch(() => null);
        setPending(false);
        if (!response?.ok) {
          const body = (await response?.json().catch(() => null)) as { error?: string } | null;
          setMessage(body?.error ?? (french ? "Le remplacement a échoué." : "Replacement failed."));
          return;
        }
        event.currentTarget.reset();
        setMessage(
          french ? "Remplacement enregistré comme brouillon." : "Replacement saved as a draft.",
        );
        router.refresh();
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="pageId" value={pageId} />
      <label className="cms-field">
        <span>{french ? "Remplacer le fichier" : "Replace file"}</span>
        <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
      </label>
      <Button type="submit" size="small" variant="secondary" loading={pending}>
        {french ? "Remplacer" : "Replace"}
      </Button>
      {message ? <small role="status">{message}</small> : null}
    </form>
  );
}
