import "server-only";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export function accountInvitationEmail(locale: "en" | "fr", acceptanceUrl: string) {
  const french = locale === "fr";
  const safeUrl = escapeHtml(acceptanceUrl);
  const subject = french ? "Votre invitation Umoja" : "Your Umoja invitation";
  const introduction = french
    ? "Un administrateur Umoja vous invite à créer votre compte."
    : "An Umoja administrator invited you to create your account.";
  const action = french ? "Accepter l’invitation" : "Accept the invitation";
  const expiry = french
    ? "Ce lien est personnel, à usage unique et expire dans 24 heures."
    : "This personal, single-use link expires in 24 hours.";
  return {
    subject,
    html: `<!doctype html><html lang="${locale}"><body><p>${introduction}</p><p><a href="${safeUrl}" rel="noreferrer">${action}</a></p><p>${expiry}</p></body></html>`,
    text: `${introduction}\n\n${action}: ${acceptanceUrl}\n\n${expiry}`,
  };
}
