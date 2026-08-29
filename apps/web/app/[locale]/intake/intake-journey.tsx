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
  useFieldArray,
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

type ValidationIssue = Readonly<{ id: string; label: string; message: string }>;
type ReviewSection = Readonly<{
  title: string;
  step: number;
  rows: readonly (readonly [string, string])[];
}>;

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
            {kind === "contact" ? <div className={styles.mockNotice} role="status">
              <span className={styles.noticeIcon} aria-hidden="true">
                i
              </span>
              <p>{copy.common.mock}</p>
            </div> : null}
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
  furthest,
  labels,
  copy,
  onSelect,
}: Readonly<{
  current: number;
  furthest: number;
  labels: readonly string[];
  copy: IntakeCopy["common"];
  onSelect: (step: number) => void;
}>) {
  const stepText = copy.step
    .replace("{current}", String(current + 1))
    .replace("{total}", String(labels.length));
  return (
    <nav className={styles.progress} aria-label={copy.progress}>
      <div className={styles.mobileProgress}>
        <p>{stepText}</p>
        <strong>{labels[current]}</strong>
        <progress
          value={current + 1}
          max={labels.length}
          aria-label={`${stepText}: ${labels[current]}`}
        />
      </div>
      <p className={styles.desktopStepCount}>{stepText}</p>
      <ol>
        {labels.map((label, index) => {
          const complete = index < current && index < furthest;
          const available = complete;
          const state =
            index === current ? copy.current : complete ? copy.completed : copy.upcoming;
          return (
            <li key={label} aria-current={index === current ? "step" : undefined}>
              {available ? (
                <button
                  type="button"
                  className={styles.progressStep}
                  onClick={() => onSelect(index)}
                  aria-label={`${copy.revisit.replace("{step}", label)}. ${state}`}
                >
                  <span className={styles.stepNumber} aria-hidden="true">
                    {complete ? "✓" : index + 1}
                  </span>
                  <span className={styles.stepText}>
                    <span>{label}</span>
                    <small>{state}</small>
                  </span>
                </button>
              ) : (
                <div className={styles.progressStep}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className={styles.stepText}>
                    <span>{label}</span>
                    <small>{state}</small>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function JourneyLayout({
  children,
  copy,
  current,
  description,
  furthest,
  labels,
  onBack,
  onNext,
  review,
  onReview,
  onStepSelect,
  title,
}: Readonly<{
  children: ReactNode;
  copy: IntakeCopy["common"];
  current: number;
  description: string;
  furthest: number;
  labels: readonly string[];
  onBack: () => void;
  onNext: () => void;
  review: boolean;
  onReview: () => void;
  onStepSelect: (step: number) => void;
  title: string;
}>) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasMounted = useRef(false);
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const heading = formRef.current?.querySelector<HTMLHeadingElement>("#journey-step-title");
    heading?.focus();
  }, [current]);
  return (
    <section className={styles.journeySection}>
      <div className={styles.journeyContainer}>
        <div className={styles.journeyGrid}>
          <Progress
            current={current}
            furthest={furthest}
            labels={labels}
            copy={copy}
            onSelect={onStepSelect}
          />
          <form
            ref={formRef}
            className={styles.formCard}
            data-interactive-ready={ready}
            noValidate
            onSubmit={(event) => event.preventDefault()}
            aria-labelledby="journey-step-title"
          >
            <fieldset className={styles.formBody} disabled={!ready}>
              <header className={styles.stepHeader}>
                <p className={styles.formStepCount}>
                  {copy.step
                    .replace("{current}", String(current + 1))
                    .replace("{total}", String(labels.length))}
                </p>
                <h2 id="journey-step-title" className={styles.stepHeading} tabIndex={-1}>
                  {title}
                </h2>
                <p className={styles.stepDescription}>{description}</p>
                {!review ? <p className={styles.requiredNote}>{copy.requiredNote}</p> : null}
              </header>
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
      </div>
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

function ErrorSummary({
  copy,
  issues,
}: Readonly<{ copy: IntakeCopy["common"]; issues: ValidationIssue[] }>) {
  if (!issues.length) return null;
  return (
    <div className={styles.errorSummary} role="alert" aria-live="assertive">
      <strong>{copy.errorSummaryTitle}</strong>
      <p>{copy.errorSummaryBody}</p>
      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            <a href={`#${issue.id}`}>
              {issue.label}: {issue.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FieldSection({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <section
      className={styles.fieldSection}
      aria-labelledby={`group-${title.replace(/\W+/g, "-").toLowerCase()}`}
    >
      <h3 id={`group-${title.replace(/\W+/g, "-").toLowerCase()}`}>{title}</h3>
      {children}
    </section>
  );
}

function ReviewSections({
  copy,
  onEdit,
  sections,
}: Readonly<{
  copy: IntakeCopy["common"];
  onEdit: (step: number) => void;
  sections: readonly ReviewSection[];
}>) {
  return (
    <div className={styles.reviewSections}>
      {sections.map((section) => (
        <section className={styles.reviewSection} key={`${section.step}-${section.title}`}>
          <header>
            <h3>{section.title}</h3>
            <Button variant="ghost" size="small" onClick={() => onEdit(section.step)}>
              {copy.edit}
              <span className="u-visually-hidden">: {section.title}</span>
            </Button>
          </header>
          <dl className={styles.reviewGrid}>
            {section.rows.map(([label, value]) => (
              <div className={styles.reviewItem} key={label}>
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

async function send(kind: IntakeKind, payload: unknown): Promise<IntakeSubmissionResult> {
  const response = await fetch(`/api/intake/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-umoja-locale": document.documentElement.lang === "fr" ? "fr" : "en" },
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
  const [furthest, setFurthest] = useState(0);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const submission = useJourneySubmit("project", form);
  const e = form.formState.errors;
  const fields: FieldPath<ProjectIntake>[][] = [
    ["contact.preferredName", "contact.email", "contact.phone"],
    ["organization.name", "organization.country", "organization.website"],
    ["need.title", "need.description", "need.serviceAreas"],
    ["budgetBand", "timing.desiredStart", "timing.targetDate", "attachments", "projectConsent"],
  ];
  const fieldMeta: Record<string, { id: string; label: string }> = {
    "contact.preferredName": { id: "project-name", label: c.name },
    "contact.email": { id: "project-email", label: c.email },
    "contact.phone": { id: "project-phone", label: c.phone },
    "organization.name": { id: "organization-name", label: c.organization },
    "organization.country": { id: "organization-country", label: c.country },
    "organization.website": { id: "organization-website", label: c.website },
    "need.title": { id: "project-title", label: c.projectTitle },
    "need.description": { id: "project-description", label: c.description },
    "need.serviceAreas": { id: "need.serviceAreas-0", label: c.services },
    budgetBand: { id: "project-budget", label: c.budget },
    "timing.desiredStart": { id: "project-timing", label: c.desiredStart },
    "timing.targetDate": { id: "project-date", label: c.targetDate },
    attachments: { id: "project-files", label: c.files },
    projectConsent: { id: "project-consent", label: c.consent },
  };
  const goToStep = (nextStep: number) => {
    setIssues([]);
    submission.setStatus("idle");
    setStep(nextStep);
  };
  const next = async () => {
    setIssues([]);
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
      const nextStep = step + 1;
      setFurthest((value) => Math.max(value, nextStep));
      goToStep(nextStep);
      return;
    }
    const invalidFields = result.error.issues.map((issue) => issue.path.join("."));
    for (const issue of result.error.issues) {
      form.setError(issue.path.join(".") as FieldPath<ProjectIntake>, { message: issue.message });
    }
    setIssues(
      result.error.issues.map((issue) => {
        const path = issue.path.join(".");
        const meta = fieldMeta[path] ?? { id: path, label: path };
        return {
          ...meta,
          message: errorText({ message: issue.message }, copy.common) ?? issue.message,
        };
      }),
    );
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
        description={
          [
            c.contactDescription,
            c.organizationDescription,
            c.needDescription,
            c.timingDescription,
            c.reviewDescription,
          ][step]
        }
        furthest={furthest}
        labels={c.steps}
        onBack={() => goToStep(Math.max(0, step - 1))}
        onNext={next}
        review={step === 4}
        onReview={() => submission.setDialog(true)}
        onStepSelect={goToStep}
        title={
          [c.contactTitle, c.organizationTitle, c.needTitle, c.timingTitle, c.reviewTitle][step]
        }
      >
        <StateMessage
          copy={copy.common}
          status={submission.status}
          onReturn={() => submission.setStatus("idle")}
        />
        <ErrorSummary copy={copy.common} issues={issues} />
        {step === 0 && (
          <FieldSection title={c.contactGroup}>
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
                inputMode="email"
                label={c.email}
                required
                autoComplete="email"
                error={errorText(e.contact?.email, copy.common)}
                {...form.register("contact.email")}
              />
              <TextField
                id="project-phone"
                type="tel"
                inputMode="tel"
                label={c.phone}
                autoComplete="tel"
                error={errorText(e.contact?.phone, copy.common)}
                {...form.register("contact.phone")}
              />
            </div>
          </FieldSection>
        )}
        {step === 1 && (
          <FieldSection title={c.organizationGroup}>
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
                inputMode="url"
                label={c.website}
                placeholder="https://"
                error={errorText(e.organization?.website, copy.common)}
                {...form.register("organization.website")}
              />
            </div>
          </FieldSection>
        )}
        {step === 2 && (
          <>
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
                  rows={7}
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
          <ReviewSections
            copy={copy.common}
            onEdit={goToStep}
            sections={[
              {
                title: c.contactGroup,
                step: 0,
                rows: [
                  [c.name, values.contact.preferredName],
                  [c.email, values.contact.email],
                  [c.phone, values.contact.phone],
                ],
              },
              {
                title: c.organizationGroup,
                step: 1,
                rows: [
                  [c.organization, values.organization.name],
                  [c.country, values.organization.country],
                  [c.website, values.organization.website],
                ],
              },
              {
                title: c.needTitle,
                step: 2,
                rows: [
                  [c.projectTitle, values.need.title],
                  [c.description, values.need.description],
                  [c.services, values.need.serviceAreas.join(", ")],
                ],
              },
              {
                title: c.timingTitle,
                step: 3,
                rows: [
                  [c.budget, values.budgetBand],
                  [c.desiredStart, values.timing.desiredStart],
                  [c.targetDate, values.timing.targetDate],
                  [c.files, values.attachments.map((file) => file.name).join(", ")],
                  [c.consent, values.projectConsent ? copy.common.yes : copy.common.no],
                ],
              },
            ]}
          />
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
  const portfolio = useFieldArray({ control: form.control, name: "portfolioItems" });
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const submission = useJourneySubmit("talent", form);
  const e = form.formState.errors;
  const fields: FieldPath<TalentIntake>[][] = [
    ["preferredName", "privateContact.email", "privateContact.phone", "country", "timezone"],
    ["skillAreas", "experienceBand"],
    portfolio.fields.flatMap((_, index) => [
      `portfolioItems.${index}.title` as FieldPath<TalentIntake>,
      `portfolioItems.${index}.url` as FieldPath<TalentIntake>,
    ]),
    [
      "availability.weeklyCapacity",
      "availability.nextAvailableDate",
      "availability.workMode",
      "languages",
    ],
    ["applicationConsent", "dataProcessingConsent", "publicProfileConsent"],
  ];
  const metaForField = (field: FieldPath<TalentIntake>) => {
    const portfolioMatch = String(field).match(/^portfolioItems\.(\d+)\.(title|url)$/);
    if (portfolioMatch) {
      const index = Number(portfolioMatch[1]);
      const isTitle = portfolioMatch[2] === "title";
      return {
        id: `portfolio-${index}-${isTitle ? "title" : "url"}`,
        label: `${copy.common.portfolioItem.replace("{number}", String(index + 1))}: ${isTitle ? c.portfolioTitleLabel : c.portfolioUrl}`,
      };
    }
    const meta: Record<string, { id: string; label: string }> = {
      preferredName: { id: "talent-name", label: c.name },
      "privateContact.email": { id: "talent-email", label: c.email },
      "privateContact.phone": { id: "talent-phone", label: c.phone },
      country: { id: "talent-country", label: c.country },
      timezone: { id: "talent-timezone", label: c.timezone },
      skillAreas: { id: "skillAreas-0", label: c.skills },
      experienceBand: { id: "talent-experience", label: c.experience },
      "availability.weeklyCapacity": { id: "talent-weekly", label: c.weekly },
      "availability.nextAvailableDate": { id: "talent-date", label: c.availableDate },
      "availability.workMode": { id: "talent-mode", label: c.workMode },
      languages: { id: "languages-0", label: c.languages },
      publicProfileConsent: { id: "public-consent", label: c.publicConsent },
      applicationConsent: { id: "application-consent", label: c.applicationConsent },
      dataProcessingConsent: { id: "data-consent", label: c.dataConsent },
    };
    return meta[String(field)] ?? { id: String(field), label: String(field) };
  };
  const goToStep = (nextStep: number) => {
    setIssues([]);
    submission.setStatus("idle");
    setStep(nextStep);
  };
  const next = async () => {
    setIssues([]);
    if (await form.trigger(fields[step], { shouldFocus: false })) {
      const nextStep = step + 1;
      setFurthest((value) => Math.max(value, nextStep));
      goToStep(nextStep);
      return;
    }
    const invalid = fields[step]
      .map((field) => ({ field, error: form.getFieldState(field).error }))
      .filter((item) => item.error);
    setIssues(
      invalid.map(({ field, error }) => ({
        ...metaForField(field),
        message: errorText(error, copy.common) ?? copy.common.errors.required,
      })),
    );
    if (invalid[0]) form.setFocus(invalid[0].field);
  };
  const values = useWatch({ control: form.control }) as TalentIntake;
  if (submission.status === "success")
    return <Success copy={copy.common} reference={submission.reference} />;
  return (
    <>
      <JourneyLayout
        copy={copy.common}
        current={step}
        description={
          [
            c.profileDescription,
            c.practiceDescription,
            c.portfolioDescription,
            c.availabilityDescription,
            c.consentDescription,
            c.reviewDescription,
          ][step]
        }
        furthest={furthest}
        labels={c.steps}
        onBack={() => goToStep(Math.max(0, step - 1))}
        onNext={next}
        review={step === 5}
        onReview={() => submission.setDialog(true)}
        onStepSelect={goToStep}
        title={
          [
            c.profileTitle,
            c.practiceTitle,
            c.portfolioTitle,
            c.availabilityTitle,
            c.consentTitle,
            c.reviewTitle,
          ][step]
        }
      >
        <StateMessage
          copy={copy.common}
          status={submission.status}
          onReturn={() => submission.setStatus("idle")}
        />
        <ErrorSummary copy={copy.common} issues={issues} />
        {step === 0 && (
          <>
            <FieldSection title={c.publicGroup}>
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
            </FieldSection>
            <FieldSection title={c.privateGroup}>
              <div className={styles.fieldGrid}>
                <TextField
                  id="talent-email"
                  label={c.email}
                  type="email"
                  inputMode="email"
                  required
                  autoComplete="email"
                  error={errorText(e.privateContact?.email, copy.common)}
                  {...form.register("privateContact.email")}
                />
                <TextField
                  id="talent-phone"
                  label={c.phone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  error={errorText(e.privateContact?.phone, copy.common)}
                  {...form.register("privateContact.phone")}
                />
              </div>
            </FieldSection>
          </>
        )}
        {step === 1 && (
          <>
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
            <p>{c.portfolioHint}</p>
            <div className={styles.portfolioList}>
              {portfolio.fields.map((item, index) => (
                <div className={styles.portfolioItem} key={item.id}>
                  <div className={styles.portfolioHeader}>
                    <h3>{copy.common.portfolioItem.replace("{number}", String(index + 1))}</h3>
                    {portfolio.fields.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => {
                          portfolio.remove(index);
                          setIssues([]);
                        }}
                      >
                        {copy.common.removePortfolio}
                        <span className="u-visually-hidden"> {index + 1}</span>
                      </Button>
                    ) : null}
                  </div>
                  <div className={styles.fieldGrid}>
                    <TextField
                      id={`portfolio-${index}-title`}
                      label={c.portfolioTitleLabel}
                      required
                      error={errorText(e.portfolioItems?.[index]?.title, copy.common)}
                      {...form.register(`portfolioItems.${index}.title`)}
                    />
                    <TextField
                      id={`portfolio-${index}-url`}
                      label={c.portfolioUrl}
                      type="url"
                      inputMode="url"
                      placeholder="https://"
                      error={errorText(e.portfolioItems?.[index]?.url, copy.common)}
                      {...form.register(`portfolioItems.${index}.url`)}
                    />
                  </div>
                </div>
              ))}
            </div>
            {portfolio.fields.length < 3 ? (
              <Button variant="secondary" onClick={() => portfolio.append({ title: "", url: "" })}>
                {copy.common.addPortfolio}
              </Button>
            ) : null}
          </>
        )}
        {step === 3 && (
          <>
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
            <div className={styles.optionalConsent}>
              <CheckboxField
                id="public-consent"
                label={c.publicConsent}
                hint={copy.common.optional}
                {...form.register("publicProfileConsent")}
              />
            </div>
            <div className={styles.requiredConsents}>
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
            </div>
          </>
        )}
        {step === 5 && (
          <ReviewSections
            copy={copy.common}
            onEdit={goToStep}
            sections={[
              {
                title: c.publicGroup,
                step: 0,
                rows: [
                  [c.name, values.preferredName],
                  [c.country, values.country],
                  [c.timezone, values.timezone],
                ],
              },
              {
                title: c.privateGroup,
                step: 0,
                rows: [
                  [c.email, values.privateContact.email],
                  [c.phone, values.privateContact.phone],
                ],
              },
              {
                title: c.practiceGroup,
                step: 1,
                rows: [
                  [c.skills, values.skillAreas.join(", ")],
                  [c.experience, values.experienceBand],
                ],
              },
              {
                title: c.portfolioGroup,
                step: 2,
                rows: values.portfolioItems.flatMap((item, index) => [
                  [
                    `${copy.common.portfolioItem.replace("{number}", String(index + 1))}: ${c.portfolioTitleLabel}`,
                    item.title,
                  ] as const,
                  [
                    `${copy.common.portfolioItem.replace("{number}", String(index + 1))}: ${c.portfolioUrl}`,
                    item.url,
                  ] as const,
                ]),
              },
              {
                title: c.availabilityGroup,
                step: 3,
                rows: [
                  [c.weekly, values.availability.weeklyCapacity],
                  [c.availableDate, values.availability.nextAvailableDate],
                  [c.workMode, values.availability.workMode],
                  [c.languages, values.languages.join(", ")],
                ],
              },
              {
                title: c.consentGroup,
                step: 4,
                rows: [
                  [c.publicConsent, values.publicProfileConsent ? copy.common.yes : copy.common.no],
                  [
                    c.applicationConsent,
                    values.applicationConsent ? copy.common.yes : copy.common.no,
                  ],
                  [c.dataConsent, values.dataProcessingConsent ? copy.common.yes : copy.common.no],
                ],
              },
            ]}
          />
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
  const [furthest, setFurthest] = useState(0);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const submission = useJourneySubmit("contact", form);
  const e: FieldErrors<ContactIntake> = form.formState.errors;
  const contactFields: FieldPath<ContactIntake>[] = [
    "preferredName",
    "email",
    "subject",
    "message",
    "contactConsent",
  ];
  const goToStep = (nextStep: number) => {
    setIssues([]);
    submission.setStatus("idle");
    setStep(nextStep);
  };
  const next = async () => {
    setIssues([]);
    if (await form.trigger(contactFields, { shouldFocus: false })) {
      setFurthest(1);
      goToStep(1);
      return;
    }
    const meta: Record<string, { id: string; label: string }> = {
      preferredName: { id: "contact-name", label: c.name },
      email: { id: "contact-email", label: c.email },
      subject: { id: "contact-subject", label: c.subject },
      message: { id: "contact-message", label: c.message },
      contactConsent: { id: "contact-consent", label: c.consent },
    };
    const invalid = contactFields
      .map((field) => ({ field, error: form.getFieldState(field).error }))
      .filter((item) => item.error);
    setIssues(
      invalid.map(({ field, error }) => ({
        ...meta[field],
        message: errorText(error, copy.common) ?? copy.common.errors.required,
      })),
    );
    if (invalid[0]) form.setFocus(invalid[0].field);
  };
  const values = useWatch({ control: form.control }) as ContactIntake;
  if (submission.status === "success")
    return <Success copy={copy.common} reference={submission.reference} />;
  return (
    <>
      <JourneyLayout
        copy={copy.common}
        current={step}
        description={step === 0 ? c.messageDescription : c.reviewDescription}
        furthest={furthest}
        labels={c.steps}
        onBack={() => goToStep(0)}
        onNext={next}
        review={step === 1}
        onReview={() => submission.setDialog(true)}
        onStepSelect={goToStep}
        title={step === 0 ? c.messageTitle : c.reviewTitle}
      >
        <StateMessage
          copy={copy.common}
          status={submission.status}
          onReturn={() => submission.setStatus("idle")}
        />
        <ErrorSummary copy={copy.common} issues={issues} />
        {step === 0 ? (
          <>
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
                inputMode="email"
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
                  rows={7}
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
          <ReviewSections
            copy={copy.common}
            onEdit={goToStep}
            sections={[
              {
                title: c.messageTitle,
                step: 0,
                rows: [
                  [c.name, values.preferredName],
                  [c.email, values.email],
                  [c.organization, values.organization],
                  [c.subject, values.subject],
                  [c.message, values.message],
                ],
              },
            ]}
          />
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
