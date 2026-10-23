/** Splits an interviewer label such as "Priya Nair, Senior Consultant - Technology" into name and title. */
export interface PersonLabel {
  name: string;
  title: string | null;
}

export function parsePerson(raw: string | null | undefined, fallback: string): PersonLabel {
  const value = raw?.trim();
  if (!value) return { name: fallback, title: null };
  const comma = value.indexOf(",");
  if (comma <= 0) return { name: value, title: null };
  const name = value.slice(0, comma).trim();
  const title = value.slice(comma + 1).trim();
  return { name: name || fallback, title: title || null };
}

/** True on Apple platforms, where the submit shortcut is Cmd+Enter. */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}
