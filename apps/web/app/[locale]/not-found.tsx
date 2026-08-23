import { Container, LinkButton, Section } from "@umoja/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { publicContentStyles as styles } from "./public-content";

export default async function NotFoundPage() {
  const locale = await getLocale();
  const t = await getTranslations("NotFound");
  return (
    <Section>
      <Container>
        <div className={styles.notFound}>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
          <LinkButton href={`/${locale}`} variant="secondary">
            {t("action")}
          </LinkButton>
        </div>
      </Container>
    </Section>
  );
}
