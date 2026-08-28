"use client";

import { Button } from "@umoja/ui";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { CmsPage } from "@/lib/cms/domain";
import type { CmsActionState } from "@/app/[locale]/admin/content/actions";

const initialState: CmsActionState = { ok: false, message: "" };

type EditorAction = (previous: CmsActionState, form: FormData) => Promise<CmsActionState>;

function fieldValue(page: CmsPage | undefined, key: string) {
  const block = page?.blocks.find(
    (candidate) => candidate.type === "field" && candidate.key === key,
  );
  return block?.type === "field" ? block.value : "";
}

export function ContentEditorForm({
  action,
  locale,
  page,
}: Readonly<{ action: EditorAction; locale: "en" | "fr"; page?: CmsPage }>) {
  const french = locale === "fr";
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dirty, setDirty] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const body = useMemo(
    () =>
      page?.blocks
        .filter((block) => block.type === "paragraph")
        .map((block) => block.text)
        .join("\n\n") ?? "",
    [page],
  );
  const consent = page?.blocks.find((block) => block.type === "publication-consent");
  const preservedBlocks =
    page?.blocks.filter(
      (block) =>
        block.type !== "field" &&
        block.type !== "paragraph" &&
        block.type !== "publication-consent",
    ) ?? [];

  useEffect(() => {
    const frame = state.ok ? requestAnimationFrame(() => setDirty(false)) : undefined;
    if (state.message && !state.ok) statusRef.current?.focus();
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [state]);

  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);

  return (
    <form className="cms-editor" action={formAction} onChange={() => setDirty(true)}>
      <input type="hidden" name="preservedBlocks" value={JSON.stringify(preservedBlocks)} />
      {state.message ? (
        <div
          ref={statusRef}
          className={`cms-form-status ${state.ok ? "is-success" : "is-error"}`}
          role={state.ok ? "status" : "alert"}
          tabIndex={state.ok ? undefined : -1}
        >
          {state.message}
          {state.fieldErrors ? (
            <ul>
              {Object.entries(state.fieldErrors).flatMap(([field, messages]) =>
                messages.map((message) => (
                  <li key={`${field}-${message}`}>
                    <strong>{field}:</strong> {message}
                  </li>
                )),
              )}
            </ul>
          ) : null}
        </div>
      ) : null}

      <fieldset className="cms-field-group">
        <legend>{french ? "Identité du contenu" : "Content identity"}</legend>
        <p>
          {french
            ? "Les identifiants stables relient les versions anglaise et française sans contrôler la mise en page."
            : "Stable identifiers connect English and French variants without controlling layout."}
        </p>
        <div className="cms-fields cms-fields-two">
          <Field
            label={french ? "Clé stable" : "Stable key"}
            name="stableKey"
            defaultValue={page?.stableKey ?? "homepage:home"}
            required
            readOnly={Boolean(page)}
            hint={french ? "Format : type:identifiant" : "Format: type:identifier"}
          />
          <Field
            label={french ? "Groupe de traduction" : "Translation group"}
            name="translationGroupId"
            defaultValue={page?.translationGroupId ?? "home"}
            required
            readOnly={Boolean(page)}
          />
          <label className="cms-field">
            <span>
              {french ? "Langue" : "Language"} <b aria-hidden="true">*</b>
            </span>
            {page ? <input type="hidden" name="contentLocale" value={page.locale} /> : null}
            <select
              name={page ? undefined : "contentLocale"}
              defaultValue={page?.locale ?? locale}
              required
              disabled={Boolean(page)}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <Field
            label={french ? "Chemin public" : "Public path"}
            name="slug"
            defaultValue={page?.slug ?? "home"}
            required
            readOnly={Boolean(page)}
            hint={french ? "Sans barre oblique initiale" : "Without a leading slash"}
          />
        </div>
      </fieldset>

      <fieldset className="cms-field-group">
        <legend>{french ? "Titre et corps" : "Title and body"}</legend>
        <p>
          {french
            ? "Les champs visibles restent du texte structuré; le HTML arbitraire est refusé."
            : "Visible fields remain structured text; arbitrary HTML is rejected."}
        </p>
        <label className="cms-field">
          <span>
            {french ? "Titre interne et public" : "Internal and public title"}{" "}
            <b aria-hidden="true">*</b>
          </span>
          <textarea name="title" defaultValue={page?.title} required maxLength={256} rows={2} />
        </label>
        <label className="cms-field">
          <span>{french ? "Corps du contenu" : "Content body"}</span>
          <textarea name="body" defaultValue={body} rows={10} aria-describedby="cms-body-help" />
          <small id="cms-body-help">
            {french
              ? "Séparez les paragraphes par une ligne vide."
              : "Separate paragraphs with a blank line."}
          </small>
        </label>
      </fieldset>

      <fieldset className="cms-field-group">
        <legend>{french ? "Contenu de la page d’accueil" : "Homepage content"}</legend>
        <p>
          {french
            ? "Ces champs sont utilisés lorsque la clé stable commence par homepage:."
            : "These fields are used when the stable key begins with homepage:."}
        </p>
        <div className="cms-fields">
          <Field
            label={french ? "Surtitre" : "Eyebrow"}
            name="hero.eyebrow"
            defaultValue={fieldValue(page, "hero.eyebrow")}
          />
          <Field
            label={french ? "Titre principal" : "Hero title"}
            name="hero.title"
            defaultValue={fieldValue(page, "hero.title")}
          />
          <label className="cms-field">
            <span>{french ? "Introduction" : "Introduction"}</span>
            <textarea
              name="hero.introduction"
              defaultValue={fieldValue(page, "hero.introduction")}
              rows={4}
            />
          </label>
          <div className="cms-fields cms-fields-two">
            <Field
              label={french ? "Action principale" : "Primary action"}
              name="hero.primaryAction"
              defaultValue={fieldValue(page, "hero.primaryAction")}
            />
            <Field
              label={french ? "Action secondaire" : "Secondary action"}
              name="hero.secondaryAction"
              defaultValue={fieldValue(page, "hero.secondaryAction")}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="cms-field-group">
        <legend>{french ? "Recherche et partage" : "Search and sharing"}</legend>
        <div className="cms-fields">
          <Field
            label={french ? "Titre SEO" : "SEO title"}
            name="seoTitle"
            defaultValue={page?.seoTitle}
            maxLength={256}
          />
          <label className="cms-field">
            <span>{french ? "Description SEO et sociale" : "SEO and social description"}</span>
            <textarea
              name="seoDescription"
              defaultValue={page?.seoDescription}
              maxLength={512}
              rows={4}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="cms-field-group">
        <legend>{french ? "Consentement de publication" : "Publication consent"}</legend>
        <p>
          {french
            ? "Obligatoire uniquement pour les études de cas et les profils publics. Conservez la preuve dans le système autorisé; saisissez ici sa référence, jamais le document lui-même."
            : "Required only for case studies and public profiles. Keep evidence in the authorized system and enter its reference here—never the document itself."}
        </p>
        <div className="cms-fields cms-fields-two">
          <Field
            label={french ? "Date et heure enregistrées" : "Recorded date and time"}
            name="consentRecordedAt"
            type="datetime-local"
            defaultValue={
              consent?.type === "publication-consent" ? consent.recordedAt.slice(0, 16) : undefined
            }
          />
          <Field
            label={french ? "Référence du consentement" : "Consent reference"}
            name="consentReference"
            defaultValue={consent?.type === "publication-consent" ? consent.reference : undefined}
            maxLength={128}
          />
        </div>
      </fieldset>

      <div className="cms-editor-actions">
        <div>
          <strong>
            {dirty
              ? french
                ? "Modifications non enregistrées"
                : "Unsaved changes"
              : french
                ? "À jour"
                : "Up to date"}
          </strong>
          <span>
            {french
              ? "La publication est une action distincte."
              : "Publishing is a separate action."}
          </span>
        </div>
        <Button
          type="submit"
          loading={pending}
          loadingLabel={french ? "Enregistrement…" : "Saving…"}
        >
          {page
            ? french
              ? "Enregistrer"
              : "Save draft"
            : french
              ? "Créer le brouillon"
              : "Create draft"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  hint,
  label,
  name,
  ...props
}: Readonly<
  { hint?: string; label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>
>) {
  const helpId = hint ? `${name.replaceAll(".", "-")}-help` : undefined;
  return (
    <label className="cms-field">
      <span>
        {label}
        {props.required ? <b aria-hidden="true"> *</b> : null}
      </span>
      <input name={name} aria-describedby={helpId} {...props} />
      {hint ? <small id={helpId}>{hint}</small> : null}
    </label>
  );
}
