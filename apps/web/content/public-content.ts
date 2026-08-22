import {
  EditorialPageSchema,
  PublicCaseStudySchema,
  PublicProfileSchema,
  ServiceCategorySchema,
  type EditorialPage,
  type LocalizedText,
  type PublicCaseStudy,
  type PublicProfile,
  type ServiceCategory,
} from "@umoja/validation";

import type { AppLocale } from "@/i18n/routing";

export const SERVICE_SLUGS = [
  "product-engineering",
  "data-ai",
  "design-brand",
  "cloud-enterprise",
  "digital-growth",
] as const;

export const CASE_STUDY_SLUGS = ["illustrative-delivery-template"] as const;
export const PROFILE_SLUGS = ["illustrative-public-profile"] as const;
export const ABOUT_SLUGS = ["model", "governance", "manifesto"] as const;
export const AFRICIT_SLUGS = ["workshops", "research", "resources"] as const;

export function localize(value: LocalizedText, locale: AppLocale) {
  return value[locale];
}

const services = ServiceCategorySchema.array().parse([
  {
    slug: "product-engineering",
    title: { en: "Product engineering", fr: "Ingénierie produit" },
    summary: {
      en: "Connect product direction, software architecture, and dependable delivery.",
      fr: "Relier l’orientation produit, l’architecture logicielle et une réalisation fiable.",
    },
    description: {
      en: "Umoja can assemble a managed product team around a clear need, from discovery and architecture through implementation, documentation, and operation.",
      fr: "Umoja peut réunir une équipe produit encadrée autour d’un besoin clair, de la découverte et l’architecture jusqu’à la réalisation, la documentation et l’exploitation.",
    },
    capabilities: [
      {
        en: "Product discovery and service framing",
        fr: "Découverte produit et cadrage du service",
      },
      { en: "Web and application engineering", fr: "Ingénierie web et applicative" },
      {
        en: "Architecture and technical stewardship",
        fr: "Architecture et accompagnement technique",
      },
    ],
    approach: [
      {
        en: "Decompose the product into explicit modules and interfaces.",
        fr: "Décomposer le produit en modules et interfaces explicites.",
      },
      {
        en: "Close milestones with accepted delivery and useful documentation.",
        fr: "Clore les jalons avec une livraison acceptée et une documentation utile.",
      },
    ],
    illustrativeLabel: {
      en: "Illustrative capability content",
      fr: "Contenu de compétence illustratif",
    },
  },
  {
    slug: "data-ai",
    title: { en: "Data and AI", fr: "Données et IA" },
    summary: {
      en: "Turn a defined use case into responsible analysis, data products, or automation.",
      fr: "Transformer un usage défini en analyse, produit de données ou automatisation responsable.",
    },
    description: {
      en: "Work begins with the decision or workflow that data should improve. Umoja can then connect research, data engineering, applied analysis, and responsible automation.",
      fr: "Le travail commence par la décision ou le processus que les données doivent améliorer. Umoja peut ensuite relier recherche, ingénierie des données, analyse appliquée et automatisation responsable.",
    },
    capabilities: [
      { en: "Data-product discovery", fr: "Découverte de produits de données" },
      { en: "Applied analysis and research", fr: "Analyse appliquée et recherche" },
      { en: "Responsible workflow automation", fr: "Automatisation responsable des processus" },
    ],
    approach: [
      {
        en: "Define the decision, evidence, and acceptable limits first.",
        fr: "Définir d’abord la décision, les preuves et les limites acceptables.",
      },
      {
        en: "Keep human review and traceable documentation in the delivery loop.",
        fr: "Maintenir la validation humaine et une documentation traçable dans la réalisation.",
      },
    ],
    illustrativeLabel: {
      en: "Illustrative capability content",
      fr: "Contenu de compétence illustratif",
    },
  },
  {
    slug: "design-brand",
    title: { en: "Design and brand", fr: "Design et marque" },
    summary: {
      en: "Make services, products, and institutions clearer, more usable, and more coherent.",
      fr: "Rendre les services, produits et institutions plus clairs, plus utilisables et plus cohérents.",
    },
    description: {
      en: "Umoja connects research, service and product design, accessible interface work, and brand systems to the operational reality behind the experience.",
      fr: "Umoja relie la recherche, le design de services et de produits, les interfaces accessibles et les systèmes de marque à la réalité opérationnelle de l’expérience.",
    },
    capabilities: [
      { en: "User and service research", fr: "Recherche utilisateur et service" },
      { en: "Accessible product interfaces", fr: "Interfaces produit accessibles" },
      { en: "Institutional brand systems", fr: "Systèmes de marque institutionnels" },
    ],
    approach: [
      {
        en: "Ground choices in real users, contexts, and constraints.",
        fr: "Fonder les choix sur des utilisateurs, contextes et contraintes réels.",
      },
      {
        en: "Build reusable systems instead of isolated screens or assets.",
        fr: "Construire des systèmes réutilisables plutôt que des écrans ou ressources isolés.",
      },
    ],
    illustrativeLabel: {
      en: "Illustrative capability content",
      fr: "Contenu de compétence illustratif",
    },
  },
  {
    slug: "cloud-enterprise",
    title: { en: "Cloud and enterprise", fr: "Cloud et organisations" },
    summary: {
      en: "Modernize systems and operations without losing essential organizational context.",
      fr: "Moderniser les systèmes et les opérations sans perdre le contexte essentiel de l’organisation.",
    },
    description: {
      en: "Umoja can connect platform engineering, internal tools, observability, and workflow modernization around continuity, maintainability, and real operating needs.",
      fr: "Umoja peut relier ingénierie de plateforme, outils internes, observabilité et modernisation des processus autour de la continuité, de la maintenabilité et des besoins opérationnels réels.",
    },
    capabilities: [
      {
        en: "Cloud platforms and delivery infrastructure",
        fr: "Plateformes cloud et infrastructure de livraison",
      },
      {
        en: "Enterprise workflow modernization",
        fr: "Modernisation des processus organisationnels",
      },
      {
        en: "Reliability and operational documentation",
        fr: "Fiabilité et documentation opérationnelle",
      },
    ],
    approach: [
      {
        en: "Map dependencies and operational ownership before change.",
        fr: "Cartographier les dépendances et les responsabilités avant le changement.",
      },
      {
        en: "Deliver in controlled modules that preserve continuity.",
        fr: "Livrer par modules maîtrisés qui préservent la continuité.",
      },
    ],
    illustrativeLabel: {
      en: "Illustrative capability content",
      fr: "Contenu de compétence illustratif",
    },
  },
  {
    slug: "digital-growth",
    title: { en: "Digital growth", fr: "Croissance numérique" },
    summary: {
      en: "Connect useful content, audience understanding, and product adoption.",
      fr: "Relier contenus utiles, compréhension des publics et adoption du produit.",
    },
    description: {
      en: "Umoja can bring content, research, experimentation, and product thinking together so growth work supports an honest and sustainable user journey.",
      fr: "Umoja peut réunir contenu, recherche, expérimentation et réflexion produit afin que la croissance soutienne un parcours utilisateur honnête et durable.",
    },
    capabilities: [
      { en: "Audience and market research", fr: "Recherche d’audience et de marché" },
      {
        en: "Content systems and useful publishing",
        fr: "Systèmes de contenu et publication utile",
      },
      { en: "Responsible product experimentation", fr: "Expérimentation produit responsable" },
    ],
    approach: [
      {
        en: "Choose measures tied to meaningful adoption, not attention alone.",
        fr: "Choisir des mesures liées à une adoption utile, pas seulement à l’attention.",
      },
      {
        en: "Document learning so each cycle improves the next.",
        fr: "Documenter les apprentissages pour améliorer chaque cycle suivant.",
      },
    ],
    illustrativeLabel: {
      en: "Illustrative capability content",
      fr: "Contenu de compétence illustratif",
    },
  },
]);

const caseStudies = PublicCaseStudySchema.array().parse([
  {
    slug: "illustrative-delivery-template",
    title: {
      en: "How a verified case study will read",
      fr: "La forme d’une étude de cas vérifiée",
    },
    summary: {
      en: "An illustrative template showing the publication structure without presenting a client, project, or outcome as real.",
      fr: "Un gabarit illustratif qui montre la structure de publication sans présenter comme réels un client, un projet ou un résultat.",
    },
    challenge: {
      en: "A future approved story will explain the client context and the problem that required change.",
      fr: "Une future histoire approuvée expliquera le contexte du client et le problème qui exigeait un changement.",
    },
    contribution: {
      en: "It will state Umoja’s exact role, team boundaries, modules, and accepted deliverables.",
      fr: "Elle précisera le rôle exact d’Umoja, les limites de l’équipe, les modules et les livrables acceptés.",
    },
    result: {
      en: "No result is claimed here. Published outcomes will require evidence and client approval.",
      fr: "Aucun résultat n’est revendiqué ici. Les résultats publiés exigeront des preuves et l’accord du client.",
    },
    status: {
      en: "Illustrative only — not a delivered project",
      fr: "Illustratif uniquement — pas un projet réalisé",
    },
    lessons: {
      en: "A verified story will separate delivery status, relationship outcome, lessons, and current state.",
      fr: "Une histoire vérifiée distinguera l’état de la réalisation, la relation, les enseignements et la situation actuelle.",
    },
    illustrativeLabel: {
      en: "Illustrative case-study template",
      fr: "Gabarit illustratif d’étude de cas",
    },
    illustrative: true,
  },
]);

const profiles = PublicProfileSchema.array().parse([
  {
    slug: "illustrative-public-profile",
    publicName: { en: "Illustrative public profile", fr: "Profil public illustratif" },
    region: { en: "Region shown after consent", fr: "Région affichée après consentement" },
    skills: [
      { en: "Verified skills appear here", fr: "Les compétences vérifiées apparaîtront ici" },
      { en: "Evidence-reviewed practice", fr: "Pratique validée par des preuves" },
    ],
    seniority: { en: "Seniority confirmed through review", fr: "Niveau confirmé par validation" },
    availability: {
      en: "Availability shared by choice",
      fr: "Disponibilité partagée volontairement",
    },
    bio: {
      en: "This is not a real person. It demonstrates the limited public projection used after explicit profile consent.",
      fr: "Ceci n’est pas une personne réelle. Ce gabarit illustre la projection publique limitée utilisée après consentement explicite.",
    },
    illustrativeLabel: { en: "Illustrative profile template", fr: "Gabarit de profil illustratif" },
    illustrative: true,
  },
]);

const editorialPages = EditorialPageSchema.array().parse([
  {
    slug: "organizations",
    eyebrow: { en: "Partner organizations", fr: "Organisations partenaires" },
    title: {
      en: "Independent organizations, connected by shared capability.",
      fr: "Des organisations indépendantes reliées par des capacités communes.",
    },
    summary: {
      en: "Verified African organizations can originate projects and work with a reusable, managed technical workforce.",
      fr: "Des organisations africaines vérifiées peuvent proposer des projets et travailler avec une force technique commune et encadrée.",
    },
    sections: [
      {
        title: { en: "Independent by design", fr: "Indépendantes par conception" },
        body: {
          en: "A partner organization keeps its own identity and responsibilities. Umoja provides a shared delivery model, not a competing master brand.",
          fr: "Une organisation partenaire conserve son identité et ses responsabilités. Umoja apporte un modèle de réalisation commun, pas une marque maîtresse concurrente.",
        },
      },
      {
        title: { en: "Verified before visibility", fr: "Vérifiées avant toute visibilité" },
        body: {
          en: "Organization names and relationships appear publicly only after verification and publication approval.",
          fr: "Les noms et relations des organisations ne paraissent publiquement qu’après vérification et autorisation de publication.",
        },
      },
    ],
  },
  {
    slug: "africit",
    eyebrow: { en: "AfricIT by Umoja", fr: "AfricIT par Umoja" },
    title: {
      en: "Learning and research connected to real delivery.",
      fr: "Apprentissage et recherche reliés à la réalisation concrète.",
    },
    summary: {
      en: "AfricIT is the home for workshops, learning resources, research themes, and public technology knowledge.",
      fr: "AfricIT accueille les ateliers, ressources d’apprentissage, thèmes de recherche et connaissances technologiques publiques.",
    },
    sections: [
      {
        title: { en: "Learn through practice", fr: "Apprendre par la pratique" },
        body: {
          en: "Workshops and resources should strengthen skills that matter in real products, organizations, and markets.",
          fr: "Les ateliers et ressources doivent renforcer les compétences utiles aux produits, organisations et marchés réels.",
        },
      },
      {
        title: { en: "Publish useful knowledge", fr: "Publier des connaissances utiles" },
        body: {
          en: "Research and learning material will be reviewed, bilingual where appropriate, and clear about evidence and limits.",
          fr: "La recherche et les supports d’apprentissage seront relus, bilingues lorsque pertinent, et transparents sur leurs preuves et leurs limites.",
        },
      },
    ],
  },
  {
    slug: "about",
    eyebrow: { en: "About Umoja", fr: "À propos d’Umoja" },
    title: {
      en: "A delivery collective built to strengthen shared capability.",
      fr: "Un collectif de réalisation conçu pour renforcer les capacités communes.",
    },
    summary: {
      en: "Umoja connects managed digital delivery, contributor progression, learning, and independent African organizations.",
      fr: "Umoja relie réalisation numérique encadrée, progression des contributeurs, apprentissage et organisations africaines indépendantes.",
    },
    sections: [
      {
        title: { en: "Trust before scale", fr: "La confiance avant l’échelle" },
        body: {
          en: "People, organizations, and public content are verified before discovery. Delivery responsibility stays visible.",
          fr: "Les personnes, organisations et contenus publics sont vérifiés avant d’être découverts. La responsabilité de réalisation reste visible.",
        },
      },
      {
        title: { en: "Operations before automation", fr: "Les opérations avant l’automatisation" },
        body: {
          en: "Stable policy comes before automated decisions, finance, or open marketplace mechanics.",
          fr: "Une politique stable précède les décisions automatisées, la finance ou les mécanismes de marché ouvert.",
        },
      },
    ],
  },
  {
    slug: "workshops",
    eyebrow: { en: "AfricIT workshops", fr: "Ateliers AfricIT" },
    title: {
      en: "Practical learning, published after review.",
      fr: "Un apprentissage pratique, publié après validation.",
    },
    summary: {
      en: "Workshop listings will connect clear learning outcomes to real delivery practice without inventing dates or instructors.",
      fr: "Les ateliers relieront des objectifs d’apprentissage clairs à la pratique réelle, sans inventer de dates ni d’intervenants.",
    },
    sections: [
      {
        title: { en: "What will appear", fr: "Ce qui paraîtra" },
        body: {
          en: "Approved sessions will state audience, prerequisites, format, learning outcomes, accessibility, and registration status.",
          fr: "Les sessions approuvées préciseront public, prérequis, format, objectifs, accessibilité et état des inscriptions.",
        },
      },
      {
        title: { en: "No invented programme", fr: "Aucun programme inventé" },
        body: {
          en: "Dates, venues, instructors, and registration links remain absent until confirmed.",
          fr: "Dates, lieux, intervenants et liens d’inscription restent absents tant qu’ils ne sont pas confirmés.",
        },
      },
    ],
  },
  {
    slug: "research",
    eyebrow: { en: "AfricIT research", fr: "Recherche AfricIT" },
    title: {
      en: "Research grounded in stated evidence and limits.",
      fr: "Une recherche explicite sur ses preuves et ses limites.",
    },
    summary: {
      en: "Reviewed themes and publications will appear with authorship, sources, status, and appropriate context.",
      fr: "Les thèmes et publications validés paraîtront avec leur attribution, leurs sources, leur statut et le contexte approprié.",
    },
    sections: [
      {
        title: { en: "Publication standard", fr: "Norme de publication" },
        body: {
          en: "A research page will distinguish a question, working note, reviewed finding, and institutional position.",
          fr: "Une page de recherche distinguera question, note de travail, résultat validé et position institutionnelle.",
        },
      },
      {
        title: { en: "Traceable review", fr: "Validation traçable" },
        body: {
          en: "Published work will identify its review status without overstating certainty.",
          fr: "Les travaux publiés indiqueront leur état de validation sans exagérer leur niveau de certitude.",
        },
      },
    ],
  },
  {
    slug: "resources",
    eyebrow: { en: "AfricIT resources", fr: "Ressources AfricIT" },
    title: {
      en: "Reusable knowledge from responsible practice.",
      fr: "Des connaissances réutilisables issues d’une pratique responsable.",
    },
    summary: {
      en: "Learning resources will be released when their scope, ownership, and review status are clear.",
      fr: "Les ressources d’apprentissage seront publiées lorsque leur périmètre, leur propriété et leur validation seront clairs.",
    },
    sections: [
      {
        title: { en: "Useful by design", fr: "Utiles par conception" },
        body: {
          en: "Resources should be accessible, maintainable, and honest about the context in which they can be applied.",
          fr: "Les ressources doivent être accessibles, maintenables et transparentes sur le contexte dans lequel elles peuvent être appliquées.",
        },
      },
      {
        title: { en: "Clear ownership", fr: "Propriété claire" },
        body: {
          en: "Each resource will state authorship, reuse terms, and its last review when approved.",
          fr: "Chaque ressource précisera son attribution, ses conditions de réutilisation et sa dernière validation après approbation.",
        },
      },
    ],
  },
  {
    slug: "model",
    eyebrow: { en: "The Umoja model", fr: "Le modèle Umoja" },
    title: {
      en: "One project, many modules, only the context each role needs.",
      fr: "Un projet, plusieurs modules, uniquement le contexte nécessaire à chaque rôle.",
    },
    summary: {
      en: "Projects are shaped before staffing so responsibility, interfaces, acceptance, and access can be explicit.",
      fr: "Les projets sont structurés avant la composition des équipes afin d’expliciter responsabilités, interfaces, acceptation et accès.",
    },
    sections: [
      {
        title: { en: "Modular delivery", fr: "Réalisation modulaire" },
        body: {
          en: "Each module defines its owner, outputs, acceptance criteria, dependencies, documentation, and confidentiality.",
          fr: "Chaque module définit son responsable, ses livrables, ses critères d’acceptation, ses dépendances, sa documentation et sa confidentialité.",
        },
      },
      {
        title: { en: "Progression through evidence", fr: "Progression fondée sur les preuves" },
        body: {
          en: "The path from applicant to Extended, Core, and leadership depends on reviewed evidence and real contribution.",
          fr: "Le parcours de candidat à Extended, Core puis responsable repose sur des preuves validées et des contributions réelles.",
        },
      },
    ],
  },
  {
    slug: "governance",
    eyebrow: { en: "Governance", fr: "Gouvernance" },
    title: {
      en: "Authority should be explicit, reviewable, and limited by role.",
      fr: "L’autorité doit être explicite, vérifiable et limitée par le rôle.",
    },
    summary: {
      en: "Governance covers policy and high-risk approvals; delivery access still depends on active project membership.",
      fr: "La gouvernance couvre les politiques et validations à risque élevé ; l’accès à la réalisation dépend toujours d’une participation active au projet.",
    },
    sections: [
      {
        title: { en: "Defined decisions", fr: "Décisions définies" },
        body: {
          en: "Project acceptance, Core promotion, partner verification, and public case studies require named authority and an audit trail.",
          fr: "L’acceptation des projets, la promotion Core, la vérification des partenaires et les études de cas publiques exigent une autorité nommée et une piste d’audit.",
        },
      },
      {
        title: { en: "No universal project access", fr: "Aucun accès universel aux projets" },
        body: {
          en: "A platform role alone never reveals unrelated client work. Active project membership and scoped responsibility remain required.",
          fr: "Un rôle global ne révèle jamais les travaux d’autres clients. Une participation active et une responsabilité définie restent obligatoires.",
        },
      },
    ],
  },
  {
    slug: "manifesto",
    eyebrow: { en: "Manifesto", fr: "Manifeste" },
    title: {
      en: "Build trusted work into lasting African capability.",
      fr: "Transformer le travail de confiance en capacités africaines durables.",
    },
    summary: {
      en: "Umoja’s direction is positive and practical: delivery should strengthen people, organizations, knowledge, and the next opportunity.",
      fr: "La direction d’Umoja est positive et concrète : la réalisation doit renforcer les personnes, les organisations, les connaissances et la prochaine opportunité.",
    },
    sections: [
      {
        title: {
          en: "Built in Africa. Ready for the world.",
          fr: "Construit en Afrique. Prêt pour le monde.",
        },
        body: {
          en: "African technical and cultural expertise belongs at the center of consequential digital work, connected across languages and regions.",
          fr: "L’expertise technique et culturelle africaine a sa place au cœur des travaux numériques importants, reliée entre langues et régions.",
        },
      },
      {
        title: { en: "Knowledge should compound", fr: "Les connaissances doivent s’accumuler" },
        body: {
          en: "Documented delivery can become learning, mentorship, reusable capability, and a clearer path for the next contributor.",
          fr: "Une réalisation documentée peut devenir apprentissage, mentorat, capacité réutilisable et voie plus claire pour le prochain contributeur.",
        },
      },
    ],
  },
]);

export function getService(slug: string): ServiceCategory | undefined {
  return services.find((service) => service.slug === slug);
}

export function getServices(): readonly ServiceCategory[] {
  return services;
}

export function getCaseStudy(slug: string): PublicCaseStudy | undefined {
  return caseStudies.find((study) => study.slug === slug);
}

export function getCaseStudies(): readonly PublicCaseStudy[] {
  return caseStudies;
}

export function getPublicProfile(slug: string): PublicProfile | undefined {
  return profiles.find((profile) => profile.slug === slug);
}

export function getPublicProfiles(): readonly PublicProfile[] {
  return profiles;
}

export function getEditorialPage(slug: string): EditorialPage | undefined {
  return editorialPages.find((page) => page.slug === slug);
}
