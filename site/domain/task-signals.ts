export type ImportedTask = {
  externalId: string;
  title: string;
  startsAt: string;
  description?: string;
  location?: string;
  sourceUrl?: string;
  kind: "occasion" | "appointment" | "admin" | "calendar";
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
