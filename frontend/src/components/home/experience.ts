/** Experience levels offered on the setup form. Values are what the backend stores. */
export const EXPERIENCE_OPTIONS = [
  { value: "fresher", label: "Fresher" },
  { value: "0-1 years", label: "0–1 years" },
  { value: "1-3 years", label: "1–3 years" },
  { value: "3-5 years", label: "3–5 years" },
  { value: "5+ years", label: "5+ years" },
] as const;

export function experienceLabel(value: string | null | undefined): string {
  const v = value?.trim() ?? "";
  if (!v) return "";
  const known = EXPERIENCE_OPTIONS.find((o) => o.value === v);
  if (known) return known.label;
  return (v.charAt(0).toUpperCase() + v.slice(1)).replace(/(\d)-(\d)/g, "$1–$2");
}
