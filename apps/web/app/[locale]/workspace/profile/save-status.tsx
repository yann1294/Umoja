"use client";

import { useFormStatus } from "react-dom";

export function ProfileSaveButton({ french }: Readonly<{ french: boolean }>) {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        className="workspace-primary-action"
        type="submit"
        disabled={pending}
        aria-disabled={pending}
      >
        {pending
          ? french
            ? "Enregistrement…"
            : "Saving…"
          : french
            ? "Enregistrer le profil"
            : "Save profile"}
      </button>
      <span role="status" aria-live="polite">
        {pending ? (french ? "Enregistrement en cours" : "Saving profile") : ""}
      </span>
    </>
  );
}
