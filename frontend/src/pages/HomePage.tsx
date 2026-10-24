import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Clock, FileUp, LoaderCircle } from "@/lib/icons";
import { toast } from "sonner";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, errorMessage } from "../api";
import { HealthBanner, SystemStatus } from "../components/HealthBanner";
import { EXPERIENCE_OPTIONS, experienceLabel } from "../components/home/experience";
import { HowItWorks } from "../components/home/HowItWorks";
import { InlineError } from "../components/InlineError";
import { PastInterviews } from "../components/PastInterviews";
import { useHealth } from "../hooks/useHealth";
import { readLocal, removeLocal, writeLocal } from "../lib/storage";
import type { InterviewProfile } from "../types";

const DRAFT_KEY = "interview-room:setup-draft";

const EMPTY: InterviewProfile = {
  company: "",
  role: "",
  experience: "fresher",
  job_description: "",
  resume_text: "",
  notes: "",
};

function loadDraft(): InterviewProfile {
  const raw = readLocal(DRAFT_KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<InterviewProfile>;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

function isBlank(form: InterviewProfile): boolean {
  return (
    !form.company.trim() &&
    !form.role.trim() &&
    !form.job_description.trim() &&
    !form.resume_text.trim() &&
    !form.notes.trim() &&
    form.experience === EMPTY.experience
  );
}

type Field = keyof InterviewProfile;
type FieldErrors = Partial<Record<"company" | "role", string>>;

/* ---------------------------------------------------------------------------------------------- */

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  /** Right-aligned note under the control, e.g. a character count. */
  counter?: ReactNode;
  className?: string;
  children: ReactNode;
}

function FormField({ id, label, required, optional, hint, error, counter, className, children }: FormFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="gap-1.5">
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
        {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
      </Label>
      {hint && (
        <p id={`${id}-hint`} className="-mt-0.5 text-[13px] leading-5 text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
      {(error || counter) && (
        <div className="flex items-start justify-between gap-3 text-xs leading-4">
          {error ? (
            <p id={`${id}-error`} className="font-medium text-destructive">
              {error}
            </p>
          ) : (
            <span />
          )}
          {counter && <span className="shrink-0 text-muted-foreground tabular-nums">{counter}</span>}
        </div>
      )}
    </div>
  );
}

function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  const list = ids.filter(Boolean).join(" ");
  return list || undefined;
}

function charCount(text: string): string {
  const n = text.length;
  return `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`;
}

/* ---------------------------------------------------------------------------------------------- */

export function HomePage() {
  const navigate = useNavigate();
  const health = useHealth();
  const [form, setForm] = useState<InterviewProfile>(loadDraft);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Claudition";
  }, []);

  useEffect(() => {
    writeLocal(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const resumeInput = useRef<HTMLInputElement>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const onResumeFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // picking the same file again should re-import it
    if (!file) return;
    setResumeError(null);
    if (file.size > 5 * 1024 * 1024) {
      setResumeError("The file is larger than 5 MB.");
      return;
    }
    setResumeLoading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const { text, chars } = await api.parseResume(file.name, btoa(binary));
      setField("resume_text", text);
      setResumeFile(file.name);
      toast.success(`Imported ${chars.toLocaleString()} characters from ${file.name}`);
    } catch (e) {
      setResumeError(errorMessage(e));
    } finally {
      setResumeLoading(false);
    }
  };

  const setField = (field: Field, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "company" || field === "role") {
      setFieldErrors((errs) => (errs[field] ? { ...errs, [field]: undefined } : errs));
    }
  };

  const bind = (field: Field) => ({
    value: form[field],
    onChange: (e: { target: { value: string } }) => setField(field, e.target.value),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const profile: InterviewProfile = {
      company: form.company.trim(),
      role: form.role.trim(),
      experience: form.experience,
      job_description: form.job_description.trim(),
      resume_text: form.resume_text.trim(),
      notes: form.notes.trim(),
    };
    const errs: FieldErrors = {};
    if (!profile.company) errs.company = "Enter the company you're interviewing with.";
    if (!profile.role) errs.role = "Enter the role, for example SDE 1 or Data Analyst.";
    if (errs.company || errs.role) {
      setFieldErrors(errs);
      setError(null);
      document.getElementById(errs.company ? "company" : "role")?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { id } = await api.createInterview(profile);
      navigate(`/interview/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    const previous = form;
    removeLocal(DRAFT_KEY);
    setForm(EMPTY);
    setError(null);
    setFieldErrors({});
    toast("Form cleared", {
      description: "The saved draft was removed from this device.",
      action: { label: "Undo", onClick: () => setForm(previous) },
    });
  };

  const blank = isBlank(form);
  const experienceOptions = EXPERIENCE_OPTIONS.some((o) => o.value === form.experience)
    ? EXPERIENCE_OPTIONS
    : [...EXPERIENCE_OPTIONS, { value: form.experience, label: experienceLabel(form.experience) }];

  return (
    <main id="main" className="page-container flex flex-col gap-6 pt-8 pb-24 sm:pt-10">
      <FadeIn className="flex flex-col gap-3 pt-4 pb-4 sm:pt-8 sm:pb-6">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Mock interview</p>
        <h1 className="max-w-[22ch] text-4xl font-normal text-balance text-primary sm:text-5xl">
          Prepare for the interview you'll <em className="text-muted-foreground">actually</em> face.
        </h1>
        <p className="max-w-[60ch] text-[15px] leading-7 text-pretty text-muted-foreground">
          Tell the interviewer where you're applying. It researches that company's current hiring process, shows you the
          plan, then runs each round with you and scores it.
        </p>
      </FadeIn>

      <HealthBanner health={health.health} error={health.error} loading={health.loading} />

      <FadeIn delay={0.03} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={onSubmit} noValidate aria-labelledby="setup-title" className="min-w-0">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-5">
              <CardTitle>
                <h2 id="setup-title" className="text-base leading-6 font-semibold">
                  Interview details
                </h2>
              </CardTitle>
              <CardDescription className="text-[13px]">
                Company and role are required. Everything else sharpens the research and the questions.
              </CardDescription>
              <CardAction>
                {!blank && (
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                    <Check aria-hidden="true" className="size-3.5 text-success" />
                    Draft saved
                  </span>
                )}
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-6 py-6">
              <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_11rem]">
                <legend className="sr-only">Position</legend>
                <FormField id="company" label="Company" required error={fieldErrors.company}>
                  <Input
                    id="company"
                    required
                    aria-required="true"
                    autoComplete="organization"
                    placeholder="e.g. Flipkart"
                    aria-invalid={!!fieldErrors.company || undefined}
                    aria-describedby={describedBy(fieldErrors.company && "company-error")}
                    {...bind("company")}
                  />
                </FormField>
                <FormField id="role" label="Role" required error={fieldErrors.role}>
                  <Input
                    id="role"
                    required
                    aria-required="true"
                    autoComplete="organization-title"
                    placeholder="e.g. SDE 1, Backend"
                    aria-invalid={!!fieldErrors.role || undefined}
                    aria-describedby={describedBy(fieldErrors.role && "role-error")}
                    {...bind("role")}
                  />
                </FormField>
                <FormField id="experience" label="Experience" className="sm:col-span-2 sm:max-w-56 xl:col-span-1 xl:max-w-none">
                  <Select value={form.experience} onValueChange={(v) => setField("experience", v)}>
                    <SelectTrigger id="experience" className="w-full">
                      <SelectValue placeholder="Select a level" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {experienceOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </fieldset>

              <FormField
                id="jd"
                label="Job description"
                hint="Paste the full posting. It steers which rounds the research looks for and what gets asked."
                counter={charCount(form.job_description)}
              >
                <Textarea
                  id="jd"
                  rows={8}
                  className="max-h-96 min-h-40"
                  placeholder="Responsibilities, required skills, tech stack, location…"
                  aria-describedby="jd-hint"
                  {...bind("job_description")}
                />
              </FormField>

              <FormField
                id="resume"
                label="Resume"
                optional
                hint="Upload a PDF, DOCX or TXT file, or paste plain text. Interviewers probe your projects and internships the way a real panel would."
                error={resumeError ?? undefined}
                counter={form.resume_text ? charCount(form.resume_text) : undefined}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={resumeInput}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={onResumeFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resumeLoading}
                    onClick={() => resumeInput.current?.click()}
                  >
                    {resumeLoading ? (
                      <LoaderCircle data-icon="inline-start" className="motion-safe:animate-spin" />
                    ) : (
                      <FileUp data-icon="inline-start" />
                    )}
                    {resumeLoading ? "Reading file…" : "Upload resume"}
                  </Button>
                  {resumeFile && !resumeLoading && (
                    <span className="truncate text-xs text-muted-foreground" title={resumeFile}>
                      Imported from {resumeFile}. You can edit the text below.
                    </span>
                  )}
                </div>
                <Textarea
                  id="resume"
                  rows={6}
                  className="max-h-80 min-h-32"
                  aria-describedby="resume-hint"
                  {...bind("resume_text")}
                />
              </FormField>

              <FormField id="notes" label="Notes for the interviewer" optional>
                <Textarea
                  id="notes"
                  rows={2}
                  className="max-h-48 min-h-16"
                  placeholder="e.g. Campus placement drive. I'm weakest at dynamic programming."
                  {...bind("notes")}
                />
              </FormField>

              <InlineError title="Couldn't start the interview" message={error} />
            </CardContent>

            <CardFooter className="flex-col-reverse items-stretch gap-3 py-4 sm:flex-row sm:items-center">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:mr-auto">
                <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                Research takes 3–8 minutes. You review the plan before round 1.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <Button type="button" variant="ghost" onClick={clearForm} disabled={submitting || blank}>
                  Clear form
                </Button>
                <Button type="submit" size="lg" disabled={submitting} className="min-w-40">
                  {submitting ? (
                    <>
                      <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" />
                      Starting…
                    </>
                  ) : (
                    <>
                      Start research
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>

        <aside aria-label="Setup information" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
          <SystemStatus health={health.health} error={health.error} loading={health.loading} />
          <HowItWorks />
        </aside>
      </FadeIn>

      <FadeIn delay={0.06}>
        <PastInterviews />
      </FadeIn>
    </main>
  );
}
