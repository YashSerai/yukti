export type LearnedFact = {
  personName: string;
  kind: "relationship" | "preference" | "budget";
  value: string;
  origin: "explicit";
  confidence: number;
};

export type ParsedConciergeMessage = {
  facts: LearnedFact[];
  rule?: { personName: string; cadenceDays: number; maximumAmountMinor: number; currency: "USD" };
  optOut: boolean;
};

const name = "([A-Z][A-Za-z'-]{1,39})";

export function parseConciergeMessage(body: string): ParsedConciergeMessage {
  const text = body.trim().replace(/\s+/g, " ");
  const facts: LearnedFact[] = [];
  const relationship = new RegExp(`${name} is my (girlfriend|boyfriend|partner|wife|husband|friend|sister|brother|mom|mother|dad|father)`, "i").exec(text);
  if (relationship) facts.push(fact(capitalize(relationship[1]), "relationship", relationship[2].toLowerCase()));

  const preference = new RegExp(`${name} (?:really )?(?:likes|loves|prefers|is into) ([^.!?]{2,80})`, "i").exec(text);
  if (preference) facts.push(fact(capitalize(preference[1]), "preference", cleanPreference(preference[2])));

  const budget = new RegExp(`(?:budget(?: for)? ${name}|${name}(?:'s)? budget)(?: is|:)? \\$?(\\d{1,4})`, "i").exec(text);
  if (budget) facts.push(fact(capitalize(budget[1] || budget[2]), "budget", `${Number(budget[3]) * 100} USD`));

  const recurring = new RegExp(`(?:get|send|buy) ${name} flowers every (week|month|(?:\\d{1,2}) weeks?)`, "i").exec(text);
  const amount = /(?:under|budget(?: is| of)?|up to) \$?(\d{1,4})/i.exec(text);
  const rule = recurring ? {
    personName: capitalize(recurring[1]),
    cadenceDays: recurring[2].toLowerCase() === "week" ? 7 : recurring[2].toLowerCase() === "month" ? 28 : Number(/\d+/.exec(recurring[2])?.[0] ?? 4) * 7,
    maximumAmountMinor: Number(amount?.[1] ?? 75) * 100,
    currency: "USD" as const,
  } : undefined;

  return { facts: dedupeFacts(facts), rule, optOut: /^(stop|unsubscribe|pause yukti|stop reminders)[.! ]*$/i.test(text) };
}

export function conciergeReply(parsed: ParsedConciergeMessage) {
  if (parsed.optOut) return "Got it. I paused proactive suggestions. You can still text me whenever you want help.";
  if (parsed.rule) return `I'll prepare flower ideas for ${parsed.rule.personName} every ${parsed.rule.cadenceDays} days. I'll ask before every purchase.`;
  if (parsed.facts.length) {
    const person = parsed.facts[0].personName;
    const learned = parsed.facts.map((item) => item.kind === "budget" ? `a $${Number(item.value.split(" ")[0]) / 100} budget` : `${item.kind}: ${item.value}`).join(", ");
    return `Saved for ${person}: ${learned}. You can correct or delete this in Yukti anytime.`;
  }
  return "Who is this for, what do they like, and what budget should I stay under?";
}

export function isRuleEligible(input: { enabled: boolean; nextEligibleAt: string; quietStartHour: number; quietEndHour: number }, now = new Date()) {
  if (!input.enabled || Date.parse(input.nextEligibleAt) > now.getTime()) return false;
  const hour = now.getUTCHours();
  const quiet = input.quietStartHour > input.quietEndHour
    ? hour >= input.quietStartHour || hour < input.quietEndHour
    : hour >= input.quietStartHour && hour < input.quietEndHour;
  return !quiet;
}

function fact(personName: string, kind: LearnedFact["kind"], value: string): LearnedFact {
  return { personName, kind, value, origin: "explicit", confidence: 100 };
}
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(); }
function cleanPreference(value: string) { return value.replace(/\b(?:and her|and his|but)\b.*$/i, "").trim().replace(/[,. ]+$/, ""); }
function dedupeFacts(facts: LearnedFact[]) { return facts.filter((item, index) => facts.findIndex((candidate) => candidate.kind === item.kind && candidate.value === item.value && candidate.personName === item.personName) === index); }
