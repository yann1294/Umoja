"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  CheckboxField,
  Container,
  FileField,
  SelectField,
  TextAreaField,
  TextField,
} from "@umoja/ui";
import {
  ContactIntakeSchema,
  ProjectIntakeSchema,
  TalentIntakeSchema,
  type ContactIntake,
  type IntakeFileMetadata,
  type IntakeKind,
  type IntakeSubmissionResult,
  type ProjectIntake,
  type TalentIntake,
} from "@umoja/validation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  useForm,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";

import type { IntakeCopy } from "@/content/intake-copy";

import styles from "./intake.module.css";

type Status = "idle" | "loading" | "success" | "duplicate" | "network" | "validation";

const subscribeToHydration = () => () => undefined;

const projectStepSchemas = [
  ProjectIntakeSchema.pick({ contact: true }),
  ProjectIntakeSchema.pick({ organization: true }),
  ProjectIntakeSchema.pick({ need: true }),
  ProjectIntakeSchema.pick({
    budgetBand: true,
    timing: true,
    attachments: true,
    projectConsent: true,
  }),
] as const;

export function IntakeJourney({ copy, kind }: Readonly<{ copy: IntakeCopy; kind: IntakeKind }>) {
  const section = copy[kind];
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="intake-title">
        <Container>
          <div className={styles.heroInner}>
            <div>
              <p className={styles.eyebrow}>{section.eyebrow}</p>
              <h1 id="intake-title">{section.title}</h1>
              <p className={styles.heroDescription}>{section.intro}</p>
            </div>
            <p className={styles.mockNotice}>{copy.common.mock}</p>
          </div>
        </Container>
      </section>
      {kind === "project" ? (
        <ProjectJourney copy={copy} />
      ) : kind === "talent" ? (
        <TalentJourney copy={copy} />
      ) : (
        <ContactJourney copy={copy} />
      )}
    </div>
  );
}

function Progress({
  current,
  labels,
  copy,
}: Readonly<{ current: number; labels: readonly string[]; copy: IntakeCopy["common"] }>) {
  return (
    <nav className={styles.progress} aria-label={copy.progress}>
      <p>
        {copy.step
          .replace("{current}", String(current + 1))
          .replace("{total}", String(labels.length))}
      </p>
      <ol>
        {labels.map((label, index) => (
          <li key={label} aria-current={index === current ? "step" : undefined}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function JourneyLayout({
  children,
  copy,
  current,
  labels,
  onBack,
  onNext,
  review,
  onReview,
}: Readonly<{
  children: ReactNode;
  copy: IntakeCopy["common"];
  current: number;
  labels: readonly string[];
  onBack: () => void;
  onNext: () => void;
  review: boolean;
  onReview: () => void;
}>) {
  const formRef = useRef<HTMLFormElement>(null);
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  useEffect(() => {
    const heading = formRef.current?.querySelector<HTMLHeadingElement>("h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  }, [current]);
  return (
    <section className={styles.journeySection}>
      <Container>
        <div className={styles.journeyGrid}>
          <Progress current={current} labels={labels} copy={copy} />
          <form
            ref={formRef}
            className={styles.formCard}
            data-interactive-ready={ready}
            noValidate
            onSubmit={(event) => event.preventDefault()}
          >
            <fieldset className={styles.formBody} disabled={!ready}>
              {children}
            </fieldset>
            <div className={styles.actions}>
              {current > 0 ? (
                <Button variant="secondary" disabled={!ready} onClick={onBack}>
                  {copy.back}
                </Button>
              ) : (
                <span />
              )}
              <Button disabled={!ready} onClick={review ? onReview : onNext}>
                {review ? copy.submit : current === labels.length - 2 ? copy.review : copy.next}
              </Button>
            </div>
          </form>
        </div>
      </Container>
    </section>
  );
}

function errorText(error: unknown, copy: IntakeCopy["common"]) {
  const code =
    typeof error === "object" && error && "message" in error ? String(error.message) : "";
  return (copy.errors[code as keyof typeof copy.errors] ?? code) || undefined;
}

function Options({
  error,
  legend,
  name,
  options,
  register,
}: Readonly<{
  error?: string;
  legend: string;
  name: string;
  options: readonly string[];
  register: (name: string, options?: object) => object;
}>) {
  return (
    <fieldset className={styles.optionGroup}>
      <legend>{legend}</legend>
      <div className={styles.options}>
        {options.map((option, index) => (
          <CheckboxField
            key={option}
            id={`${name}-${index}`}
            label={option}
            value={option}
            {...register(name)}
          />
        ))}
      </div>
      {error ? (
        <p className={styles.groupError} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function SelectOptions({
  options,
  placeholder,
}: Readonly<{ options: readonly string[]; placeholder: string }>) {
  return (
    <>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option value={option} key={option}>
          {option}
        </option>
      ))}
    </>
  );
}

function ReviewGrid({ rows }: Readonly<{ rows: readonly (readonly [string, string])[] }>) {
  return (
    <dl className={styles.reviewGrid}>
      {rows.map(([label, value]) => (
        <div className={styles.reviewItem} key={label}>
          <dt>{label}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

async function send(kind: IntakeKind, payload: unknown): Promise<IntakeSubmissionResult> {
  const response = await fetch(`/api/intake/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as IntakeSubmissionResult;
  if (!response.ok && result.status !== "duplicate" && result.status !== "validation_error")
    throw new Error("network");
  return result;
}

function StateMessage({
  copy,
  status,
  onReturn,
}: Readonly<{ copy: IntakeCopy["common"]; status: Status; onReturn: () => void }>) {
  if (status !== "duplicate" && status !== "network" && status !== "validation") return null;
  const title =
    status === "duplicate"
      ? copy.duplicateTitle
      : status === "network"
        ? copy.networkTitle
        : copy.validationTitle;
  const body =
    status === "duplicate"
      ? copy.duplicateBody
      : status === "network"
        ? copy.networkBody
        : copy.validationTitle;
  return (
    <div className={styles.stateMessage} role="alert" data-submission-state={status}>
      <h2>{title}</h2>
      <p>{body}</p>
      <Button variant="secondary" onClick={onReturn}>
        {copy.retry}
      </Button>
    </div>
  );
}

function Success({ copy, reference }: Readonly<{ copy: IntakeCopy["common"]; reference: string }>) {
  return (
    <section className={styles.journeySection} data-submission-state="success">
      <Container>
        <div className={styles.successPanel} role="status">
          <h2>{copy.successTitle}</h2>
          <p>{copy.successBody}</p>
          <p>
            <strong>{copy.reference}:</strong> {reference}
          </p>
          <p>{copy.mock}</p>
        </div>
      </Container>
    </section>
  );
}

function ConfirmDialog({
  copy,
  loading,
  onClose,
  onConfirm,
}: Readonly<{
  copy: IntakeCopy["common"];
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmRef.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !loading) onClose();
          if (event.key === "Tab") {
            const buttons =
              event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
            if (!buttons.length) return;
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <h2 id="confirm-title">{copy.confirmTitle}</h2>
        <p>{copy.confirmBody}</p>
        <div className={styles.dialogActions}>
          <Button
            ref={confirmRef}
            loading={loading}
            loadingLabel={copy.loading}
            onClick={onConfirm}
          >
            {copy.confirm}
          </Button>
          <Button variant="secondary" disabled={loading} onClick={onClose}>
            {copy.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function useJourneySubmit<T extends FieldValues>(kind: IntakeKind, form: UseFormReturn<T>) {
  const [status, setStatus] = useState<Status>("idle");
  const [reference, setReference] = useState("");
  const [dialog, setDialog] = useState(false);
  const submit = form.handleSubmit(async (data) => {
    setStatus("loading");
    try {
      const result = await send(kind, data);
      setDialog(false);
      if (result.status === "success") {
        setReference(result.reference);
        setStatus("success");
      } else {
        setStatus(result.status === "duplicate" ? "duplicate" : "validation");
      }
    } catch {
      setDialog(false);
      setStatus("network");
    }
  });
  return { status, reference, dialog, setDialog, submit, setStatus };
}

function ProjectJourney({ copy }: Readonly<{ copy: IntakeCopy }>) {
  const c = copy.project;
  const form = useForm<ProjectIntake>({
    resolver: zodResolver(ProjectIntakeSchema),
    defaultValues: {
      contact: { preferredName: "", email: "", phone: "" },
      organization: { name: "", country: "", website: "" },
      need: { title: "", description: "", serviceAreas: [] },
      budgetBand: "",
      timing: { desiredStart: "", targetDate: "" },
      attachments: [],
      projectConsent: false,
    },
    mode: "onChange",
  });
  const [step, setStep] = useState(0);
  const submission = useJourneySubmit("project", form);
  const e = form.formState.errors;
  const fields: FieldPath<ProjectIntake>[][] = [
    ["contact.preferredName", "contact.email"],
    ["organization.name", "organization.country", "organization.website"],
    ["need.title", "need.description", "need.serviceAreas"],
    ["budgetBand", "timing.desiredStart", "timing.targetDate", "attachments", "projectConsent"],
  ];
  const next = async () => {
    form.clearErrors(fields[step]);
    const value = form.getValues();
    const stepValues = [
      { contact: value.contact },
      { organization: value.organization },
      { need: value.need },
      {
        budgetBand: value.budgetBand,
        timing: value.timing,
        attachments: value.attachments,
        projectConsent: value.projectConsent,
      },
    ] as const;
    const result = projectStepSchemas[step].safeParse(stepValues[step]);
    if (result.success) {
      setStep(step + 1);
      return;
    }
    const invalidFields = result.error.issues.map((issue) => issue.path.join("."));
    for (const issue of result.error.issues) {
      form.setError(issue.path.join(".") as FieldPath<ProjectIntake>, { message: issue.message });
    }
    const firstInvalid = fields[step].find((field) => invalidFields.includes(field));
    if (firstInvalid) form.setFocus(firstInvalid);
  };
  const values = useWatch({ control: form.control }) as ProjectIntake;
  if (submission.status === "success")
    return <Success copy={copy.common} reference={submission.reference} />;
  return (
    <>
      <JourneyLayout
        copy={copy.common}
        current={step}
        labels={c.steps}
        onBack={() => setStep(Math.max(0, step - 1))}
        onNext={next}
        review={step === 4}
        onReview={() => submission.setDialog(true)}
      >
        <StateMessage
          copy={copy.common}
          status={submission.status}
          onReturn={() => submission.setStatus("idle")}
        />
        {step === 0 && (
          <>
            <h2 className={styles.stepHeading}>{c.contactTitle}</h2>
            <div className={styles.fieldGrid}>
              <TextField
                id="project-name"
                label={c.name}
                required
                autoComplete="name"
                error={errorText(e.contact?.preferredName, copy.common)}
                {...form.register("contact.preferredName")}
              />
              <TextField
                id="project-email"
                type="email"
                label={c.email}
                required
                autoComplete="email"
                error={errorText(e.contact?.email, copy.common)}
                {...form.register("contact.email")}
              />
              <TextField
                id="project-phone"
                type="tel"
                label={c.phone}
                autoComplete="tel"
                error={errorText(e.contact?.phone, copy.common)}
                {...form.register("contact.phone")}
              />
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className={styles.stepHeading}>{c.organizationTitle}</h2>
            <div className={styles.fieldGrid}>
              <TextField
                id="organization-name"
                label={c.organization}
                required
                autoComplete="organization"
                error={errorText(e.organization?.name, copy.common)}
                {...form.register("organization.name")}
              />
              <TextField
                id="organization-country"
                label={c.country}
                required
                autoComplete="country-name"
                error={errorText(e.organization?.country, copy.common)}
                {...form.register("organization.country")}
              />
              <TextField
                id="organization-website"
                type="url"
                label={c.website}
                placeholder="https://"
                error={errorText(e.organization?.website, copy.common)}
                {...form.register("organization.website")}
              />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className={styles.stepHeading}>{c.needTitle}</h2>
            <div className={styles.fieldGrid}>
              <div className={styles.wide}>
                <TextField
                  id="project-title"
                  label={c.projectTitle}
                  required
                  error={errorText(e.need?.title, copy.common)}
                  {...form.register("need.title")}
                />
              </div>
              <div className={styles.wide}>
                <TextAreaField
                  id="project-description"
                  label={c.description}
                  hint={c.descriptionHint}
                  required
                  error={errorText(e.need?.description, copy.common)}
                  {...form.register("need.description")}
                />
              </div>
              <div className={styles.wide}>
                <Options
                  legend={c.services}
                  name="need.serviceAreas"
                  options={c.serviceOptions}
                  register={form.register as never}
                  error={errorText(e.need?.serviceAreas, copy.common)}
                />
              </div>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className={styles.stepHeading}>{c.timingTitle}</h2>
            <div className={styles.fieldGrid}>
              <SelectField
                id="project-budget"
                label={c.budget}
                required
                error={errorText(e.budgetBand, copy.common)}
                {...form.register("budgetBand")}
              >
                <SelectOptions options={c.budgetOptions} placeholder={copy.common.choose} />
              </SelectField>
              <SelectField
                id="project-timing"
                label={c.desiredStart}
                required
                error={errorText(e.timing?.desiredStart, copy.common)}
                {...form.register("timing.desiredStart")}
              >
                <SelectOptions options={c.timingOptions} placeholder={copy.common.choose} />
              </SelectField>
              <TextField
                id="project-date"
                type="date"
                label={c.targetDate}
                error={errorText(e.timing?.targetDate, copy.common)}
                {...form.register("timing.targetDate")}
              />
              <div className={styles.wide}>
                <FileField
                  id="project-files"
                  label={c.files}
                  hint={c.filesHint}
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []).map<IntakeFileMetadata>(
                      (file) => ({ name: file.name, mimeType: file.type, size: file.size }),
                    );
                    form.setValue("attachments", files, { shouldValidate: true });
                  }}
                  error={errorText(e.attachments, copy.common)}
                />
                {values.attachments.length ? (
                  <ul className={styles.fileList}>
                    {values.attachments.map((file) => (
                      <li key={file.name}>
                        {file.name} — {Math.ceil(file.size / 1024)} KB
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className={styles.wide}>
                <CheckboxField
                  id="project-consent"
                  label={c.consent}
                  required
                  error={errorText(e.projectConsent, copy.common)}
                  {...form.register("projectConsent")}
                />
              </div>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className={styles.stepHeading}>{c.reviewTitle}</h2>
            <ReviewGrid
              rows={[
                [c.name, values.contact.preferredName],
                [c.email, values.contact.email],
                [c.organization, values.organization.name],
                [c.country, values.organization.country],
                [c.projectTitle, values.need.title],
                [c.description, values.need.description],
                [c.services, values.need.serviceAreas.join(", ")],
                [c.budget, values.budgetBand],
                [c.desiredStart, values.timing.desiredStart],
                [c.files, values.attachments.map((file) => file.name).join(", ")],
              ]}
            />
          </>
        )}
      </JourneyLayout>
      {submission.dialog ? (
        <ConfirmDialog
          copy={copy.common}
          loading={submission.status === "loading"}
          onClose={() => submission.setDialog(false)}
          onConfirm={submission.submit}
        />
      ) : null}
    </>
  );
}

function TalentJourney({ copy }: Readonly<{ copy: IntakeCopy }>) {
  const c = copy.talent;
  const form = useForm<TalentIntake>({
    resolver: zodResolver(TalentIntakeSchema),
    defaultValues: {
      preferredName: "",
      privateContact: { email: "", phone: "" },
      country: "",
      timezone: "",
      skillAreas: [],
      experienceBand: "",
      portfolioItems: [{ title: "", url: "" }],
      availability: { weeklyCapacity: "", nextAvailableDate: "", workMode: "" },
      languages: [],
      publicProfileConsent: false,
      applicationConsent: false,
      dataProcessingConsent: false,
    },
    mode: "onChange",
  });
  const [step, setStep] = useState(0);
  const submission = useJourneySubmit("talent", form);
  const e = form.formState.errors;
  const fields: FieldPath<TalentIntake>[][] = [
    ["preferredName", "privateContact.email", "country", "timezone"],
    ["skillAreas", "experienceBand"],
    ["portfolioItems"],
    [
      "availability.weeklyCapacity",
      "availability.nextAvailableDate",
      "availability.workMode",
      "languages",
    ],
    ["applicationConsent", "dataProcessingConsent", "publicProfileConsent"],
  ];
  const next = async () => {
    if (await form.trigger(fields[step], { shouldFocus: true })) setStep(step + 1);
  };
  const values = useWatch({ control: form.control }) as TalentIntake;
  if (submission.status === "success")
    return <Success copy={copy.common} reference={submission.reference} />;
  return (
    <>
      <JourneyLayout
        copy={copy.common}
        current={step}
        labels={c.steps}
        onBack={() => setStep(Math.max(0, step - 1))}
        onNext={next}
        review={step === 5}
        onReview={() => submission.setDialog(true)}
      >
        <StateMessage
          copy={copy.common}
          status={submission.status}
          onReturn={() => submission.setStatus("idle")}
        />
        {step === 0 && (
          <>
            <h2 className={styles.stepHeading}>{c.profileTitle}</h2>
            <div className={styles.fieldGrid}>
              <TextField
                id="talent-name"
                label={c.name}
                required
                autoComplete="name"
                error={errorText(e.preferredName, copy.common)}
                {...form.register("preferredName")}
              />
              <TextField
                id="talent-email"
                label={c.email}
                type="email"
                required
                autoComplete="email"
                error={errorText(e.privateContact?.email, copy.common)}
                {...form.register("privateContact.email")}
              />
              <TextField
                id="talent-phone"
                label={c.phone}
                type="tel"
                autoComplete="tel"
                error={errorText(e.privateContact?.phone, copy.common)}
                {...form.register("privateContact.phone")}
              />
              <TextField
                id="talent-country"
                label={c.country}
                required
                autoComplete="country-name"
                error={errorText(e.country, copy.common)}
                {...form.register("country")}
              />
              <TextField
                id="talent-timezone"
                label={c.timezone}
                required
                placeholder="Africa/Dakar"
                error={errorText(e.timezone, copy.common)}
                {...form.register("timezone")}
              />
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className={styles.stepHeading}>{c.practiceTitle}</h2>
            <Options
              legend={c.skills}
              name="skillAreas"
              options={c.skillOptions}
              register={form.register as never}
              error={errorText(e.skillAreas, copy.common)}
            />
            <SelectField
              id="talent-experience"
              label={c.experience}
              required
              error={errorText(e.experienceBand, copy.common)}
              {...form.register("experienceBand")}
            >
              <SelectOptions options={c.experienceOptions} placeholder={copy.common.choose} />
            </SelectField>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className={styles.stepHeading}>{c.portfolioTitle}</h2>
            <p>{c.portfolioHint}</p>
            <div className={styles.fieldGrid}>
              <TextField
                id="portfolio-title"
                label={c.portfolioTitleLabel}
                required
                error={errorText(e.portfolioItems?.[0]?.title, copy.common)}
                {...form.register("portfolioItems.0.title")}
              />
              <TextField
                id="portfolio-url"
                label={c.portfolioUrl}
                type="url"
                placeholder="https://"
                error={errorText(e.portfolioItems?.[0]?.url, copy.common)}
                {...form.register("portfolioItems.0.url")}
              />
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className={styles.stepHeading}>{c.availabilityTitle}</h2>
            <div className={styles.fieldGrid}>
              <SelectField
                id="talent-weekly"
                label={c.weekly}
                required
                error={errorText(e.availability?.weeklyCapacity, copy.common)}
                {...form.register("availability.weeklyCapacity")}
              >
                <SelectOptions options={c.weeklyOptions} placeholder={copy.common.choose} />
              </SelectField>
              <TextField
                id="talent-date"
                type="date"
                label={c.availableDate}
                error={errorText(e.availability?.nextAvailableDate, copy.common)}
                {...form.register("availability.nextAvailableDate")}
              />
              <SelectField
                id="talent-mode"
                label={c.workMode}
                required
                error={errorText(e.availability?.workMode, copy.common)}
                {...form.register("availability.workMode")}
              >
                <SelectOptions options={c.workModeOptions} placeholder={copy.common.choose} />
              </SelectField>
              <div className={styles.wide}>
                <Options
                  legend={c.languages}
                  name="languages"
                  options={c.languageOptions}
                  register={form.register as never}
                  error={errorText(e.languages, copy.common)}
                />
              </div>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className={styles.stepHeading}>{c.consentTitle}</h2>
            <CheckboxField
              id="public-consent"
              label={c.publicConsent}
              hint={copy.common.required.replace(copy.common.required, copy.common.no)}
              {...form.register("publicProfileConsent")}
            />
            <CheckboxField
              id="application-consent"
              label={c.applicationConsent}
              required
              error={errorText(e.applicationConsent, copy.common)}
              {...form.register("applicationConsent")}
            />
            <CheckboxField
              id="data-consent"
              label={c.dataConsent}
              required
              error={errorText(e.dataProcessingConsent, copy.common)}
              {...form.register("dataProcessingConsent")}
            />
          </>
        )}
        {step === 5 && (
          <>
            <h2 className={styles.stepHeading}>{c.reviewTitle}</h2>
            <ReviewGrid
              rows={[
                [c.name, values.preferredName],
                [c.email, values.privateContact.email],
                [c.country, values.country],
                [c.timezone, values.timezone],
                [c.skills, values.skillAreas.join(", ")],
                [c.experience, values.experienceBand],
                [c.portfolioTitleLabel, values.portfolioItems.map((item) => item.title).join(", ")],
                [c.weekly, values.availability.weeklyCapacity],
                [c.languages, values.languages.join(", ")],
                [c.publicConsent, values.publicProfileConsent ? copy.common.yes : copy.common.no],
              ]}
            />
          </>
        )}
      </JourneyLayout>
      {submission.dialog ? (
        <ConfirmDialog
          copy={copy.common}
          loading={submission.status === "loading"}
          onClose={() => submission.setDialog(false)}
          onConfirm={submission.submit}
        />
      ) : null}
    </>
  );
}

function ContactJourney({ copy }: Readonly<{ copy: IntakeCopy }>) {
  const c = copy.contact;
  const form = useForm<ContactIntake>({
    resolver: zodResolver(ContactIntakeSchema),
    defaultValues: {
      preferredName: "",
      email: "",
      organization: "",
      subject: "",
      message: "",
      contactConsent: false,
    },
    mode: "onChange",
  });
  const [step, setStep] = useState(0);
  const submission = useJourneySubmit("contact", form);
  const e: FieldErrors<ContactIntake> = form.formState.errors;
  const next = async () => {
    if (
      await form.trigger(["preferredName", "email", "subject", "message", "contactConsent"], {
        shouldFocus: true,
      })
    )
      setStep(1);
  };
  const values = useWatch({ control: form.control }) as ContactIntake;
  if (submission.status === "success")
    return <Success copy={copy.common} reference={submission.reference} />;
  return (
    <>
      <JourneyLayout
        copy={copy.common}
        current={step}
        labels={c.steps}
        onBack={() => setStep(0)}
        onNext={next}
        review={step === 1}
        onReview={() => submission.setDialog(true)}
      >
        <StateMessage
          copy={copy.common}
          status={submission.status}
          onReturn={() => submission.setStatus("idle")}
        />
        {step === 0 ? (
          <>
            <h2 className={styles.stepHeading}>{c.messageTitle}</h2>
            <div className={styles.fieldGrid}>
              <TextField
                id="contact-name"
                label={c.name}
                required
                autoComplete="name"
                error={errorText(e.preferredName, copy.common)}
                {...form.register("preferredName")}
              />
              <TextField
                id="contact-email"
                label={c.email}
                type="email"
                required
                autoComplete="email"
                error={errorText(e.email, copy.common)}
                {...form.register("email")}
              />
              <TextField
                id="contact-organization"
                label={c.organization}
                autoComplete="organization"
                error={errorText(e.organization, copy.common)}
                {...form.register("organization")}
              />
              <TextField
                id="contact-subject"
                label={c.subject}
                required
                error={errorText(e.subject, copy.common)}
                {...form.register("subject")}
              />
              <div className={styles.wide}>
                <TextAreaField
                  id="contact-message"
                  label={c.message}
                  required
                  error={errorText(e.message, copy.common)}
                  {...form.register("message")}
                />
              </div>
              <div className={styles.wide}>
                <CheckboxField
                  id="contact-consent"
                  label={c.consent}
                  required
                  error={errorText(e.contactConsent, copy.common)}
                  {...form.register("contactConsent")}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.stepHeading}>{c.reviewTitle}</h2>
            <ReviewGrid
              rows={[
                [c.name, values.preferredName],
                [c.email, values.email],
                [c.organization, values.organization],
                [c.subject, values.subject],
                [c.message, values.message],
              ]}
            />
          </>
        )}
      </JourneyLayout>
      {submission.dialog ? (
        <ConfirmDialog
          copy={copy.common}
          loading={submission.status === "loading"}
          onClose={() => submission.setDialog(false)}
          onConfirm={submission.submit}
        />
      ) : null}
    </>
  );
}
