export type ImportedTask = {
  externalId: string;
  title: string;
  startsAt: string;
  description?: string;
  location?: string;
  sourceUrl?: string;
  kind: "occasion" | "appointment" | "admin" | "calendar" | "email";
};

export function calendarTasks(payload: unknown): ImportedTask[] {
  return findRecords(payload).map<ImportedTask | null>((item) => {
    const id = text(item.id ?? item.eventId ?? item.event_id);
    const title = text(item.summary ?? item.title ?? item.subject);
    const startsAt = dateValue(item.start) || dateValue(item.startTime) || dateValue(item.start_time);
    if (!id || !title || !startsAt) return null;
    return {
      externalId: `googlecalendar:${id}`,
      title,
      startsAt,
      description: text(item.description) || undefined,
      location: text(item.location) || undefined,
      sourceUrl: safeUrl(item.htmlLink ?? item.html_link) || undefined,
      kind: classify(title, "calendar"),
    } satisfies ImportedTask;
  }).filter((item): item is ImportedTask => Boolean(item));
}

export function emailTasks(payload: unknown, now = new Date()): ImportedTask[] {
  const fallback = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  return findRecords(payload).map<ImportedTask | null>((item) => {
    const id = text(item.id ?? item.messageId ?? item.message_id);
    const title = text(item.subject ?? item.title);
    const snippet = text(item.snippet ?? item.preview ?? item.body).slice(0, 400);
    if (!id || !title || !relevant(`${title} ${snippet}`)) return null;
    const startsAt = firstDate(`${title} ${snippet}`, now) ?? fallback;
    return { externalId: `gmail:${id}`, title, startsAt, description: snippet || undefined, kind: classify(title, "email") } satisfies ImportedTask;
  }).filter((item): item is ImportedTask => Boolean(item));
}

function findRecords(payload: unknown): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const visit = (value: unknown, depth: number) => {
    if (depth > 5 || value == null) return;
    if (Array.isArray(value)) { for (const item of value) visit(item, depth + 1); return; }
    if (typeof value !== "object") return;
    const row = value as Record<string, unknown>;
    if ((row.id || row.messageId || row.eventId) && (row.summary || row.subject || row.title)) found.push(row);
    for (const child of Object.values(row)) if (typeof child === "object") visit(child, depth + 1);
  };
  visit(payload, 0);
  return found.filter((row, index) => found.findIndex((candidate) => candidate === row || text(candidate.id) === text(row.id)) === index);
}

function classify(value: string, fallback: ImportedTask["kind"]): ImportedTask["kind"] {
  if (/birthday|anniversary|wedding|mother'?s day|father'?s day|valentine/i.test(value)) return "occasion";
  if (/dentist|doctor|appointment|checkup|follow[- ]?up/i.test(value)) return "appointment";
  if (/passport|renew|deadline|expire|visa|license|tax/i.test(value)) return "admin";
  return fallback;
}
function relevant(value: string) { return /birthday|anniversary|appointment|dentist|doctor|renew|passport|deadline|reservation|delivery|expire|mother'?s day|father'?s day|valentine/i.test(value); }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function safeUrl(value: unknown) { const url = text(value); return /^https:\/\//.test(url) ? url : ""; }
function dateValue(value: unknown): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return dateValue(row.dateTime ?? row.date_time ?? row.date);
  }
  return "";
}
function firstDate(value: string, now: Date) {
  const iso = /\b(20\d{2}-\d{2}-\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2})?)?\b/.exec(value)?.[0];
  if (iso && !Number.isNaN(Date.parse(iso))) return new Date(iso).toISOString();
  const month = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,\s*(20\d{2}))?/i.exec(value);
  if (!month) return null;
  const year = Number(month[3] ?? now.getUTCFullYear());
  const parsed = new Date(`${month[1]} ${month[2]}, ${year} 12:00:00 UTC`);
  if (parsed.getTime() < now.getTime() && !month[3]) parsed.setUTCFullYear(year + 1);
  return parsed.toISOString();
}
