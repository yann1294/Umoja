import { createServices, isMissing } from "./appwrite-client.mjs";
import { loadConfig } from "./config.mjs";

if (!process.argv.includes("--development"))
  throw new Error("Seeding requires the explicit --development flag.");
const config = loadConfig();
const services = createServices("APPWRITE_SERVER_API_KEY");
const now = new Date().toISOString();
const seeds = [
  {
    id: "seed-home-en",
    locale: "en",
    title: "Umoja development home",
    description: "Development-only CMS seed content.",
  },
  {
    id: "seed-home-fr",
    locale: "fr",
    title: "Accueil de développement Umoja",
    description: "Contenu CMS réservé au développement.",
  },
];
for (const seed of seeds) {
  try {
    await services.tables.getRow({
      databaseId: config.database.id,
      tableId: "cms_pages",
      rowId: seed.id,
    });
  } catch (error) {
    if (!isMissing(error)) throw error;
    await services.tables.createRow({
      databaseId: config.database.id,
      tableId: "cms_pages",
      rowId: seed.id,
      data: {
        stableKey: "development-home",
        translationGroupId: "development-home",
        locale: seed.locale,
        slug: "development-cms-seed",
        state: "draft",
        title: seed.title,
        seoTitle: seed.title,
        seoDescription: seed.description,
        blocks: JSON.stringify([{ type: "paragraph", text: seed.description }]),
        authorId: "bootstrap",
        updatedById: "bootstrap",
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}
console.log(`Verified ${seeds.length} bilingual development draft seed rows.`);
