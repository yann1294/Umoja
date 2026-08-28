import {
  canUseSupabaseWorkspaceCapability as canUseWorkspaceCapability,
  type SupabaseWorkspaceUser as WorkspaceUser,
} from "@/lib/supabase/auth";
import { displayName, roleLabels } from "./workspace-copy";

export function WorkspaceOverview({
  locale,
  user,
}: Readonly<{ locale: "en" | "fr"; user: WorkspaceUser }>) {
  const french = locale === "fr";
  const name = displayName(user.name, locale);
  const cards = [
    canUseWorkspaceCapability(user, "admin.operations")
      ? {
          title: french ? "Opérations Umoja" : "Umoja operations",
          description: french
            ? "Accédez à l’espace de coordination administrative autorisé."
            : "Open the authorized operations administration area.",
          status: french ? "Ouvrir les opérations" : "Open operations",
          href: `/${locale}/admin`,
        }
      : null,
    canUseWorkspaceCapability(user, "cms.manage")
      ? {
          title: french ? "Contenu bilingue" : "Bilingual content",
          description: french
            ? "Rédigez, révisez et prévisualisez le contenu public en anglais et en français."
            : "Draft, review, and preview public content in English and French.",
          status: french ? "Ouvrir le contenu" : "Open content",
          href: `/${locale}/admin/content`,
        }
      : null,
    canUseWorkspaceCapability(user, "intake.review")
      ? {
          title: french ? "Révision des demandes" : "Intake review",
          description: french
            ? "Consultez les demandes chiffrées et assurez leur suivi."
            : "Review encrypted submissions and manage their follow-up.",
          status: french ? "Ouvrir les demandes" : "Open intakes",
          href: `/${locale}/admin/intake`,
        }
      : null,
    canUseWorkspaceCapability(user, "projects.manage")
      ? {
          title: french ? "Coordination de projets" : "Project coordination",
          description: french
            ? "Les espaces de projet autorisés seront ajoutés lors de la mise en place du suivi."
            : "Authorized project spaces will arrive with the delivery workflow.",
          status: french ? "Fonction prévue" : "Planned capability",
        }
      : null,
    user.roles.includes("core") || user.roles.includes("extended")
      ? {
          title: french ? "Participation au réseau" : "Network participation",
          description: french
            ? "Les opportunités opt-in seront présentées ici lorsqu’elles seront vérifiées."
            : "Opt-in opportunities will appear here after they are verified.",
          status: french ? "Aucune action requise" : "No action required",
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card));

  return (
    <>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">{french ? "Votre espace" : "Your workspace"}</p>
          <h1>{french ? `Bonjour, ${name}` : `Welcome, ${name}`}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Retrouvez les espaces de travail accessibles avec votre rôle Umoja."
              : "Find the work areas available to your Umoja role."}
          </p>
        </div>
      </header>

      {!user.mfaEnabled ? <MfaNotice locale={locale} /> : null}

      <section className="workspace-section" aria-labelledby="workspace-destinations-heading">
        <div className="workspace-section-heading">
          <h2 id="workspace-destinations-heading">
            {french ? "Espaces disponibles" : "Available work areas"}
          </h2>
          <p>{french ? "Selon vos accès actuels" : "Based on your current access"}</p>
        </div>
        <div className="workspace-grid">
          {cards.map((card) => (
            <article
              className="workspace-panel"
              data-actionable={Boolean(card.href)}
              key={card.title}
            >
              <h3>
                {card.href ? (
                  <a className="workspace-panel-link" href={card.href}>
                    {card.title}
                  </a>
                ) : (
                  card.title
                )}
              </h3>
              <p>{card.description}</p>
              <span className="workspace-panel-status">
                {card.status}
                {card.href ? " →" : ""}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section
        className="workspace-section workspace-readiness"
        aria-label={french ? "Accès et préparation du compte" : "Access and account readiness"}
      >
        <div className="workspace-access-panel">
          <h2>{french ? "Vos accès" : "Your access"}</h2>
          <ul className="workspace-access-list">
            <li>
              <span>{french ? "Rôles actifs" : "Active roles"}</span>
              <strong>{user.roles.map((role) => roleLabels[role][locale]).join(", ")}</strong>
            </li>
            <li>
              <span>{french ? "Adresse vérifiée" : "Verified address"}</span>
              <strong>
                {user.emailVerified
                  ? french
                    ? "Oui"
                    : "Yes"
                  : french
                    ? "Action requise"
                    : "Action needed"}
              </strong>
            </li>
            <li>
              <span>{french ? "Sécurité du compte" : "Account security"}</span>
              <strong>
                {user.mfaEnabled
                  ? french
                    ? "MFA active"
                    : "MFA active"
                  : french
                    ? "MFA à configurer"
                    : "MFA needs setup"}
              </strong>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

export function AdminOverview({
  locale,
  user,
}: Readonly<{ locale: "en" | "fr"; user: WorkspaceUser }>) {
  const french = locale === "fr";
  const cards = [
    {
      title: french ? "Accès et membres" : "Access and membership",
      description: french
        ? "Les invitations et rôles sont contrôlés par les attributions relationnelles Umoja."
        : "Invitations and roles are controlled through Umoja’s relational assignments.",
      status: french ? "Gestion assistée" : "Console-assisted",
    },
    {
      title: french ? "Opérations de contenu" : "Content operations",
      description: french
        ? "Gérez les brouillons bilingues, les révisions et la publication autorisée."
        : "Manage bilingual drafts, revisions, and authorized publishing.",
      status: french ? "Ouvrir le contenu" : "Open content",
      href: `/${locale}/admin/content`,
    },
    {
      title: french ? "Révision des demandes" : "Intake review",
      description: french
        ? "Examinez les dossiers chiffrés et attribuez le suivi."
        : "Review encrypted submissions and assign follow-up.",
      status: french ? "Ouvrir les demandes" : "Open intakes",
      href: `/${locale}/admin/intake`,
    },
    {
      title: french ? "Sécurité et audit" : "Security and audit",
      description: french
        ? "Les événements sensibles sont préparés pour un suivi audité, sans exposer les données personnelles."
        : "Sensitive events are prepared for audited handling without exposing personal data.",
      status: french ? "Fondation active" : "Foundation active",
    },
  ];

  return (
    <>
      <header className="workspace-page-header">
        <div>
          <p className="workspace-eyebrow">{french ? "Administration" : "Administration"}</p>
          <h1>{french ? "Opérations Umoja" : "Umoja operations"}</h1>
          <p className="workspace-page-summary">
            {french
              ? "Coordonnez les responsabilités opérationnelles autorisées et préparez les prochains outils internes."
              : "Coordinate authorized operational responsibilities and prepare the next internal tools."}
          </p>
        </div>
      </header>

      {!user.mfaEnabled ? <MfaNotice locale={locale} administrative /> : null}

      <section className="workspace-section" aria-labelledby="admin-responsibilities-heading">
        <div className="workspace-section-heading">
          <h2 id="admin-responsibilities-heading">
            {french ? "Responsabilités opérationnelles" : "Operational responsibilities"}
          </h2>
          <p>{french ? "Aucune donnée fictive" : "No simulated activity"}</p>
        </div>
        <div className="workspace-grid workspace-grid-admin">
          {cards.map((card) => (
            <article
              className="workspace-panel"
              data-actionable={Boolean(card.href)}
              key={card.title}
            >
              <h3>
                {card.href ? (
                  <a className="workspace-panel-link" href={card.href}>
                    {card.title}
                  </a>
                ) : (
                  card.title
                )}
              </h3>
              <p>{card.description}</p>
              <span className="workspace-panel-status">
                {card.status}
                {card.href ? " →" : ""}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section
        className="workspace-section workspace-boundary"
        aria-labelledby="governance-boundary-heading"
      >
        <h2 id="governance-boundary-heading">
          {french ? "Limite de gouvernance" : "Governance boundary"}
        </h2>
        <p>
          {french
            ? "Le rôle admin autorise les opérations approuvées uniquement. Les décisions de gouvernance et la publication d’affirmations juridiques restent bloquées jusqu’à l’approbation d’une politique distincte."
            : "The admin role authorizes approved operations only. Governance decisions and publication of legal claims remain blocked until a separate policy is approved."}
        </p>
      </section>
    </>
  );
}

function MfaNotice({
  administrative = false,
  locale,
}: Readonly<{ administrative?: boolean; locale: "en" | "fr" }>) {
  const french = locale === "fr";
  return (
    <aside className="workspace-notice" aria-labelledby="workspace-security-notice">
      <span className="workspace-notice-label">{french ? "Sécurité" : "Security"}</span>
      <div>
        <strong id="workspace-security-notice">
          {french ? "MFA à configurer" : "MFA setup needed"}
        </strong>
        <p>
          {administrative
            ? french
              ? "L’accès de développement continue, mais l’administration de production reste bloquée jusqu’à vérification de la MFA."
              : "Development access can continue, but production administration remains blocked until MFA is verified."
            : french
              ? "Renforcez votre compte avant le lancement en production."
              : "Strengthen your account before the production launch."}
        </p>
      </div>
      <span className="workspace-panel-status">
        {french ? "Prérequis de lancement" : "Launch requirement"}
      </span>
    </aside>
  );
}
